import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetSchema = z.object({
  url: z.string(),
  type: z.string(),
  size: z.number(),
});

export type Asset = z.infer<typeof assetSchema>;

export const clonesTable = pgTable("clones", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull().default(""),
  html: text("html").notNull().default(""),
  cssFiles: jsonb("css_files").notNull().default([]),
  jsFiles: jsonb("js_files").notNull().default([]),
  images: jsonb("images").notNull().default([]),
  htmlSize: integer("html_size").notNull().default(0),
  totalAssets: integer("total_assets").notNull().default(0),
  clonedAt: timestamp("cloned_at").notNull().defaultNow(),
});

export const insertCloneSchema = createInsertSchema(clonesTable).omit({ id: true, clonedAt: true });
export type InsertClone = z.infer<typeof insertCloneSchema>;
export type Clone = typeof clonesTable.$inferSelect;
