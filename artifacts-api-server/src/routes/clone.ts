import { Router } from "express";
import * as cheerio from "cheerio";
import archiver from "archiver";
import { db, clonesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import type { Asset } from "@workspace/db";

const router = Router();

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function getByteSize(str: string): number {
  return Buffer.byteLength(str, "utf8");
}

router.post("/clone", async (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  let targetUrl = url.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  try {
    new URL(targetUrl);
  } catch {
    res.status(400).json({ error: "Invalid URL provided" });
    return;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PageCloner/1.0; +https://pagecloner.app)",
      },
      signal: AbortSignal.timeout(15000),
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $("title").text().trim() || new URL(targetUrl).hostname;

    const cssFiles: Asset[] = [];
    const jsFiles: Asset[] = [];
    const images: Asset[] = [];

    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const resolved = resolveUrl(targetUrl, href);
        cssFiles.push({ url: resolved, type: "text/css", size: 0 });
      }
    });

    $("style").each((_, el) => {
      const content = $(el).html() || "";
      if (content.trim()) {
        cssFiles.push({
          url: "[inline style]",
          type: "text/css",
          size: getByteSize(content),
        });
      }
    });

    $("script").each((_, el) => {
      const src = $(el).attr("src");
      if (src) {
        const resolved = resolveUrl(targetUrl, src);
        jsFiles.push({ url: resolved, type: "application/javascript", size: 0 });
      } else {
        const content = $(el).html() || "";
        if (content.trim()) {
          jsFiles.push({
            url: "[inline script]",
            type: "application/javascript",
            size: getByteSize(content),
          });
        }
      }
    });

    $("img").each((_, el) => {
      const src = $(el).attr("src");
      if (src && !src.startsWith("data:")) {
        const resolved = resolveUrl(targetUrl, src);
        images.push({ url: resolved, type: "image", size: 0 });
      }
    });

    $('source[srcset], img[srcset]').each((_, el) => {
      const srcset = $(el).attr("srcset");
      if (srcset) {
        srcset.split(",").forEach((entry) => {
          const src = entry.trim().split(/\s+/)[0];
          if (src && !src.startsWith("data:")) {
            const resolved = resolveUrl(targetUrl, src);
            if (!images.find((i) => i.url === resolved)) {
              images.push({ url: resolved, type: "image", size: 0 });
            }
          }
        });
      }
    });

    const htmlSize = getByteSize(html);
    const totalAssets = cssFiles.length + jsFiles.length + images.length;

    const [inserted] = await db
      .insert(clonesTable)
      .values({
        url: targetUrl,
        title,
        html,
        cssFiles,
        jsFiles,
        images,
        htmlSize,
        totalAssets,
      })
      .returning();

    res.json({
      id: inserted.id,
      url: inserted.url,
      title: inserted.title,
      html: inserted.html,
      cssFiles: inserted.cssFiles,
      jsFiles: inserted.jsFiles,
      images: inserted.images,
      htmlSize: inserted.htmlSize,
      totalAssets: inserted.totalAssets,
      clonedAt: inserted.clonedAt.toISOString(),
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to clone page");
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    res.status(500).json({ error: `Failed to fetch page: ${message}` });
  }
});

router.get("/clone/history", async (req, res) => {
  try {
    const history = await db
      .select({
        id: clonesTable.id,
        url: clonesTable.url,
        title: clonesTable.title,
        totalAssets: clonesTable.totalAssets,
        clonedAt: clonesTable.clonedAt,
      })
      .from(clonesTable)
      .orderBy(desc(clonesTable.clonedAt))
      .limit(20);

    res.json(
      history.map((h) => ({
        ...h,
        clonedAt: h.clonedAt.toISOString(),
      }))
    );
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to fetch clone history");
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.post("/clone/:id/download-assets", async (req, res) => {
  const id = Number(req.params.id);
  const { type } = req.body as { type?: string };

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid clone id" });
    return;
  }
  if (type !== "images" && type !== "documents") {
    res.status(400).json({ error: "type must be 'images' or 'documents'" });
    return;
  }

  const [clone] = await db
    .select()
    .from(clonesTable)
    .where(eq(clonesTable.id, id))
    .limit(1);

  if (!clone) {
    res.status(404).json({ error: "Clone not found" });
    return;
  }

  const hostname = (() => {
    try { return new URL(clone.url).hostname; } catch { return "page"; }
  })();

  const assets: Asset[] =
    type === "images"
      ? (clone.images as Asset[]).filter((a) => !a.url.startsWith("["))
      : [
          ...(clone.cssFiles as Asset[]).filter((a) => !a.url.startsWith("[")),
          ...(clone.jsFiles as Asset[]).filter((a) => !a.url.startsWith("[")),
        ];

  const zipName = `${hostname}-${type}.zip`;
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  const fetchedNames = new Set<string>();

  for (const asset of assets) {
    try {
      const response = await fetch(asset.url, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PageCloner/1.0)" },
      });
      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());

      let filename = asset.url.split("/").pop()?.split("?")[0] || "asset";
      if (!filename || filename.length > 120) filename = `asset_${fetchedNames.size}`;
      // deduplicate filenames
      const base = filename;
      let deduped = base;
      let n = 1;
      while (fetchedNames.has(deduped)) { deduped = `${n}_${base}`; n++; }
      fetchedNames.add(deduped);

      archive.append(buffer, { name: deduped });
    } catch {
      // skip assets that can't be fetched
    }
  }

  await archive.finalize();
});

export default router;
