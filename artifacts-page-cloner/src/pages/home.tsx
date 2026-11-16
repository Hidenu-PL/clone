import React, { useState, useEffect, useRef, useCallback } from "react";
import { useClonePage, useGetCloneHistory, getGetCloneHistoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Crosshair, Terminal, Link as LinkIcon, Database, Code, Image as ImageIcon, FileCode, CheckCircle2, FileJson, Download, Pencil, RotateCcw, Eye, RefreshCw, Search, Replace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadAssetsZip(
  id: number,
  type: "images" | "documents",
  setLoading: (v: boolean) => void,
) {
  setLoading(true);
  try {
    const res = await fetch(`/api/clone/${id}/download-assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (!res.ok) throw new Error("Server error");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="([^"]+)"/);
    a.download = match?.[1] ?? `${type}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setLoading(false);
  }
}

// Corner Bracket Decorator Component
const TerminalPanel = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`relative border border-primary/20 bg-background/80 backdrop-blur p-6 ${className}`}>
      {/* Top Left */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
      {/* Top Right */}
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
      {/* Bottom Left */}
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
      {/* Bottom Right */}
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
      
      {children}
    </div>
  );
};

// Navbar Component
const Navbar = ({ status }: { status: "READY" | "SCANNING" | "ERROR" }) => {
  return (
    <header className="border-b border-primary/20 bg-background/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-primary" />
          <h1 className="font-tech text-xl font-bold tracking-wider text-primary">PAGE_CLONER<span className="animate-pulse">_</span></h1>
        </div>
        <div className="flex items-center gap-2 text-sm font-mono border border-primary/20 px-3 py-1.5 bg-primary/5">
          <span className="text-muted-foreground">STATUS:</span>
          <span className={`font-bold flex items-center gap-2 ${
            status === "READY" ? "text-accent" : 
            status === "SCANNING" ? "text-primary animate-pulse" : "text-destructive"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              status === "READY" ? "bg-accent" : 
              status === "SCANNING" ? "bg-primary" : "bg-destructive"
            }`} />
            {status === "READY" ? "SYSTEM_READY" : 
             status === "SCANNING" ? "ACQUIRING_TARGET" : "SYSTEM_FAULT"}
          </span>
        </div>
      </div>
    </header>
  );
};

export default function Home() {
  const [targetUrl, setTargetUrl] = useState("");
  const [downloadingImages, setDownloadingImages] = useState(false);
  const [downloadingDocs, setDownloadingDocs] = useState(false);
  const [activeTab, setActiveTab] = useState<"assets" | "editor">("assets");
  const [editedHtml, setEditedHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [replaceCount, setReplaceCount] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clonePage = useClonePage({
    mutation: {
      onSuccess: () => {
        toast({
          title: "TARGET ACQUIRED",
          description: "Extraction completed successfully.",
          className: "border-primary bg-background text-primary font-mono",
        });
        queryClient.invalidateQueries({ queryKey: getGetCloneHistoryQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "EXTRACTION FAILED",
          description: err.error || "Unknown error occurred.",
          variant: "destructive",
          className: "font-mono border-destructive",
        });
      }
    }
  });

  const { data: history } = useGetCloneHistory({ 
    query: { queryKey: getGetCloneHistoryQueryKey() } 
  });

  useEffect(() => {
    if (clonePage.data?.html) {
      setEditedHtml(clonePage.data.html);
      setPreviewHtml(clonePage.data.html);
      setActiveTab("assets");
    }
  }, [clonePage.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshPreview = useCallback(() => {
    setPreviewHtml(editedHtml);
    setPreviewKey((k) => k + 1);
  }, [editedHtml]);

  const handleResetHtml = useCallback(() => {
    if (!clonePage.data) return;
    setEditedHtml(clonePage.data.html);
    setPreviewHtml(clonePage.data.html);
    setPreviewKey((k) => k + 1);
  }, [clonePage.data]);

  const handleReplaceAll = useCallback(() => {
    if (!findText) return;
    const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedFind, "gi");
    const matches = (editedHtml.match(regex) || []).length;
    if (matches === 0) {
      setReplaceCount(0);
      return;
    }
    setEditedHtml((prev) => prev.replace(regex, replaceText));
    setReplaceCount(matches);
  }, [findText, replaceText, editedHtml]);

  const handleReplaceNext = useCallback(() => {
    if (!findText) return;
    const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedFind, "i");
    if (!regex.test(editedHtml)) {
      setReplaceCount(0);
      return;
    }
    setEditedHtml((prev) => prev.replace(regex, replaceText));
    setReplaceCount(1);
  }, [findText, replaceText, editedHtml]);

  const toggleFindReplace = useCallback(() => {
    setShowFindReplace((v) => {
      if (!v) setTimeout(() => findInputRef.current?.focus(), 50);
      return !v;
    });
    setReplaceCount(null);
  }, []);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;
    let formattedUrl = targetUrl;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
      setTargetUrl(formattedUrl);
    }
    clonePage.mutate({ data: { url: formattedUrl } });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen text-foreground selection:bg-primary/30 pb-20">
      <Navbar status={clonePage.isPending ? "SCANNING" : clonePage.isError ? "ERROR" : "READY"} />
      
      <main className="max-w-6xl mx-auto px-4 pt-10 space-y-12">
        {/* Target Acquisition Section */}
        <section>
          <div className="flex items-center gap-2 text-primary mb-4 font-tech tracking-widest uppercase">
            <Crosshair className="w-4 h-4" />
            <h2 className="text-sm">TARGET ACQUISITION</h2>
          </div>
          
          <TerminalPanel>
            <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-primary/50 text-sm">{'>'}</span>
                </div>
                <Input
                  type="text"
                  placeholder="ENTER TARGET URL (e.g. https://example.com)"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="pl-8 bg-transparent border-primary/30 focus-visible:ring-primary h-12 text-lg placeholder:text-muted-foreground/50 transition-colors hover:border-primary/50"
                  disabled={clonePage.isPending}
                  data-testid="input-target-url"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                  <span className="w-2 h-4 bg-primary animate-pulse" />
                </div>
              </div>
              <Button 
                type="submit" 
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-background font-bold tracking-widest group"
                disabled={clonePage.isPending || !targetUrl}
                data-testid="button-analyze"
              >
                {clonePage.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ANALYZING...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                    ANALYZE TARGET
                  </>
                )}
              </Button>
            </form>
          </TerminalPanel>
        </section>

        {/* State Management */}
        {clonePage.isPending && (
          <TerminalPanel className="h-64 flex flex-col items-center justify-center relative overflow-hidden border-primary/50 border-dashed">
            <div className="absolute inset-0 w-full h-full border-t border-primary/30 animate-scan-line bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <div className="text-primary font-tech tracking-widest text-xl typed-text">
              EXTRACTING PAYLOAD...
            </div>
            <div className="text-muted-foreground text-sm mt-2 font-mono flex gap-4">
              <span>[DOWNLOADING ASSETS]</span>
              <span>[PARSING DOM]</span>
            </div>
          </TerminalPanel>
        )}

        {!clonePage.isPending && !clonePage.data && (
          <TerminalPanel className="h-64 flex flex-col items-center justify-center border-primary/20 opacity-50">
            <div className="w-16 h-16 rounded-full border border-dashed border-primary/50 flex items-center justify-center mb-4">
              <Crosshair className="w-8 h-8 text-primary/50" />
            </div>
            <div className="text-primary/50 font-tech tracking-widest text-lg">
              AWAITING_INPUT
            </div>
            <p className="text-muted-foreground mt-2 max-w-md text-center text-sm">
              Enter a valid URL to extract and clone all resources.
            </p>
          </TerminalPanel>
        )}

        {clonePage.data && !clonePage.isPending && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-accent font-tech tracking-widest uppercase">
                <CheckCircle2 className="w-4 h-4" />
                <h2 className="text-sm">EXTRACTION COMPLETE</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10 font-mono tracking-wider rounded-none h-8 px-3 text-xs gap-2"
                  onClick={() => {
                    const hostname = (() => { try { return new URL(clonePage.data!.url).hostname; } catch { return "page"; } })();
                    const report = {
                      url: clonePage.data!.url,
                      title: clonePage.data!.title,
                      clonedAt: clonePage.data!.clonedAt,
                      htmlSize: clonePage.data!.htmlSize,
                      totalAssets: clonePage.data!.totalAssets,
                      cssFiles: clonePage.data!.cssFiles,
                      jsFiles: clonePage.data!.jsFiles,
                      images: clonePage.data!.images,
                    };
                    downloadBlob(JSON.stringify(report, null, 2), `${hostname}-report.json`, "application/json");
                  }}
                >
                  <Download className="w-3 h-3" />
                  REPORT.JSON
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-background font-mono tracking-wider rounded-none h-8 px-3 text-xs gap-2"
                  onClick={() => {
                    const hostname = (() => { try { return new URL(clonePage.data!.url).hostname; } catch { return "page"; } })();
                    downloadBlob(clonePage.data!.html, `${hostname}.html`, "text/html");
                  }}
                >
                  <Download className="w-3 h-3" />
                  SOURCE.HTML
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "HTML SIZE", value: formatSize(clonePage.data.htmlSize), icon: Code },
                { label: "STYLESHEETS", value: clonePage.data.cssFiles.length, icon: FileCode },
                { label: "SCRIPTS", value: clonePage.data.jsFiles.length, icon: FileJson },
                { label: "IMAGES", value: clonePage.data.images.length, icon: ImageIcon },
              ].map((stat, i) => (
                <div key={i} className="border border-primary/20 bg-background/50 p-4 relative group hover:border-primary/50 transition-colors">
                  <div className="text-muted-foreground text-xs mb-1 flex items-center gap-2">
                    <stat.icon className="w-3 h-3" />
                    {stat.label}
                  </div>
                  <div className="text-xl font-bold text-foreground font-tech group-hover:text-primary transition-colors">{stat.value}</div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50" />
                </div>
              ))}
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-0 border-b border-primary/20 font-mono">
              {([
                { id: "assets", label: "ASSETS", icon: Database },
                { id: "editor", label: "EDITOR", icon: Pencil },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-xs tracking-widest transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "border-primary text-primary font-bold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Editor Panel */}
            {activeTab === "editor" && (
              <div className="space-y-3">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-primary/70 font-mono text-xs tracking-widest">
                    <Pencil className="w-3 h-3" />
                    <span>EDIT_MODE — modify HTML then refresh preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleFindReplace}
                      className={`border-primary/30 font-mono rounded-none h-7 px-3 text-xs gap-2 ${showFindReplace ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                    >
                      <Search className="w-3 h-3" />
                      FIND &amp; REPLACE
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResetHtml}
                      className="border-primary/30 text-muted-foreground hover:text-primary hover:bg-primary/10 font-mono rounded-none h-7 px-3 text-xs gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      RESET
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRefreshPreview}
                      className="border-primary/40 text-primary hover:bg-primary/10 font-mono rounded-none h-7 px-3 text-xs gap-2"
                    >
                      <RefreshCw className="w-3 h-3" />
                      REFRESH PREVIEW
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const hostname = (() => { try { return new URL(clonePage.data!.url).hostname; } catch { return "page"; } })();
                        downloadBlob(editedHtml, `${hostname}-edited.html`, "text/html");
                      }}
                      className="bg-primary hover:bg-primary/90 text-background font-mono rounded-none h-7 px-3 text-xs gap-2"
                    >
                      <Download className="w-3 h-3" />
                      DOWNLOAD EDITED
                    </Button>
                  </div>
                </div>

                {/* Find & Replace toolbar */}
                {showFindReplace && (
                  <div className="border border-primary/30 bg-black/60 p-3 flex flex-wrap items-center gap-3 font-mono">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Search className="w-3 h-3 text-primary/60 shrink-0" />
                      <input
                        ref={findInputRef}
                        value={findText}
                        onChange={(e) => { setFindText(e.target.value); setReplaceCount(null); }}
                        placeholder="Find..."
                        className="flex-1 bg-transparent border border-primary/20 text-xs text-foreground font-mono px-2 py-1 focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Replace className="w-3 h-3 text-primary/60 shrink-0" />
                      <input
                        value={replaceText}
                        onChange={(e) => { setReplaceText(e.target.value); setReplaceCount(null); }}
                        placeholder="Replace with..."
                        className="flex-1 bg-transparent border border-primary/20 text-xs text-foreground font-mono px-2 py-1 focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReplaceNext}
                        disabled={!findText}
                        className="border-primary/30 text-primary hover:bg-primary/10 font-mono rounded-none h-7 px-3 text-xs"
                      >
                        REPLACE NEXT
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReplaceAll}
                        disabled={!findText}
                        className="border-primary/40 text-primary hover:bg-primary/10 font-mono rounded-none h-7 px-3 text-xs"
                      >
                        REPLACE ALL
                      </Button>
                      {replaceCount !== null && (
                        <span className={`text-xs font-mono ${replaceCount === 0 ? "text-destructive" : "text-accent"}`}>
                          {replaceCount === 0 ? "NO MATCH" : `${replaceCount} REPLACED`}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Split pane: editor + preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-primary/20">
                  {/* Editor */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20 bg-black/40 text-xs text-muted-foreground font-mono">
                      <Code className="w-3 h-3 text-primary/50" />
                      <span>HTML EDITOR</span>
                      <span className="ml-auto text-primary/40">{editedHtml.length.toLocaleString()} chars</span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={editedHtml}
                      onChange={(e) => setEditedHtml(e.target.value)}
                      spellCheck={false}
                      className="flex-1 min-h-[500px] w-full bg-black/60 text-xs text-green-400/80 font-mono p-4 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 border-r border-primary/20 leading-relaxed"
                      style={{ tabSize: 2 }}
                      onKeyDown={(e) => {
                        if (e.key === "Tab") {
                          e.preventDefault();
                          const el = e.currentTarget;
                          const start = el.selectionStart;
                          const end = el.selectionEnd;
                          const newVal = editedHtml.substring(0, start) + "  " + editedHtml.substring(end);
                          setEditedHtml(newVal);
                          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
                        }
                      }}
                    />
                  </div>

                  {/* Preview */}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/20 bg-black/40 text-xs text-muted-foreground font-mono">
                      <Eye className="w-3 h-3 text-primary/50" />
                      <span>LIVE PREVIEW</span>
                      <span className="ml-auto text-primary/40 text-[10px]">sandboxed</span>
                    </div>
                    <iframe
                      key={previewKey}
                      srcDoc={previewHtml}
                      sandbox="allow-scripts allow-same-origin"
                      className="flex-1 min-h-[500px] w-full bg-white border-0"
                      title="Page Preview"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "assets" && (
            <TerminalPanel className="p-0 border-0 bg-transparent">
              <Accordion type="multiple" defaultValue={["html"]} className="w-full space-y-4 font-mono">
                
                <AccordionItem value="html" className="border border-primary/20 bg-background/80 px-4">
                  <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors text-lg font-bold uppercase tracking-wider font-tech py-4">
                    <div className="flex items-center gap-3">
                      <Code className="w-5 h-5 text-primary" />
                      <span>SOURCE.HTML</span>
                      <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-none text-xs">
                        {formatSize(clonePage.data.htmlSize)}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="relative">
                      <ScrollArea className="h-96 w-full border border-primary/20 bg-black/50 p-4 mt-2">
                        <pre className="text-xs text-muted-foreground font-mono leading-relaxed">
                          <code>{clonePage.data.html}</code>
                        </pre>
                      </ScrollArea>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* CSS + JS sections (documents) */}
                {[
                  { id: "css", title: "STYLESHEETS.CSS", icon: FileCode, data: clonePage.data.cssFiles },
                  { id: "js", title: "SCRIPTS.JS", icon: FileJson, data: clonePage.data.jsFiles },
                ].map((section) => (
                  <AccordionItem key={section.id} value={section.id} className="border border-primary/20 bg-background/80 px-4">
                    <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors text-lg font-bold uppercase tracking-wider font-tech py-4">
                      <div className="flex items-center gap-3">
                        <section.icon className="w-5 h-5 text-primary" />
                        <span>{section.title}</span>
                        <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-none text-xs">
                          {section.data.length} ITEMS
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      {section.data.length === 0 ? (
                        <div className="text-muted-foreground text-sm p-4 text-center border border-dashed border-primary/20 bg-black/20">
                          NO ASSETS DETECTED
                        </div>
                      ) : (
                        <ScrollArea className="h-64 w-full border border-primary/20 bg-black/50 mt-2 p-1">
                          <div className="space-y-1">
                            {section.data.map((asset, i) => (
                              <div key={i} className="flex items-center justify-between p-2 hover:bg-primary/10 group transition-colors text-sm border border-transparent hover:border-primary/20">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <LinkIcon className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
                                  <span className="truncate text-muted-foreground group-hover:text-foreground transition-colors" title={asset.url}>
                                    {asset.url}
                                  </span>
                                </div>
                                <span className="shrink-0 text-xs text-primary/70 bg-primary/5 px-2 py-0.5 border border-primary/10 ml-4 font-mono">
                                  {formatSize(asset.size)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}

                {/* Images section with bulk download */}
                <AccordionItem value="img" className="border border-primary/20 bg-background/80 px-4">
                  <AccordionTrigger className="hover:no-underline hover:text-primary transition-colors text-lg font-bold uppercase tracking-wider font-tech py-4">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      <span>MEDIA.IMG</span>
                      <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-none text-xs">
                        {clonePage.data.images.length} ITEMS
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {clonePage.data.images.length === 0 ? (
                      <div className="text-muted-foreground text-sm p-4 text-center border border-dashed border-primary/20 bg-black/20">
                        NO ASSETS DETECTED
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-end mt-2 mb-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadingImages}
                            className="border-primary/30 text-primary hover:bg-primary/10 font-mono tracking-wider rounded-none h-7 px-3 text-xs gap-2"
                            onClick={() => downloadAssetsZip(clonePage.data!.id, "images", setDownloadingImages)}
                          >
                            {downloadingImages ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            {downloadingImages ? "DOWNLOADING..." : `DOWNLOAD ALL (${clonePage.data.images.filter(a => !a.url.startsWith("[")).length} FILES)`}
                          </Button>
                        </div>
                        <ScrollArea className="h-64 w-full border border-primary/20 bg-black/50 p-1">
                          <div className="space-y-1">
                            {clonePage.data.images.map((asset, i) => (
                              <div key={i} className="flex items-center justify-between p-2 hover:bg-primary/10 group transition-colors text-sm border border-transparent hover:border-primary/20">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <LinkIcon className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0" />
                                  <span className="truncate text-muted-foreground group-hover:text-foreground transition-colors" title={asset.url}>
                                    {asset.url}
                                  </span>
                                </div>
                                <span className="shrink-0 text-xs text-primary/70 bg-primary/5 px-2 py-0.5 border border-primary/10 ml-4 font-mono">
                                  {formatSize(asset.size)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Documents bulk download (CSS + JS combined) */}
                {(clonePage.data.cssFiles.length + clonePage.data.jsFiles.length) > 0 && (
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingDocs}
                      className="border-primary/30 text-primary hover:bg-primary/10 font-mono tracking-wider rounded-none h-7 px-3 text-xs gap-2"
                      onClick={() => downloadAssetsZip(clonePage.data!.id, "documents", setDownloadingDocs)}
                    >
                      {downloadingDocs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      {downloadingDocs
                        ? "DOWNLOADING..."
                        : `DOWNLOAD ALL DOCUMENTS (${
                            [...clonePage.data.cssFiles, ...clonePage.data.jsFiles].filter(a => !a.url.startsWith("[")).length
                          } FILES)`}
                    </Button>
                  </div>
                )}

              </Accordion>
            </TerminalPanel>
            )}
          </div>
        )}

        {/* History Section */}
        {history && history.length > 0 && (
          <section className="pt-8 border-t border-primary/20">
             <div className="flex items-center gap-2 text-primary mb-6 font-tech tracking-widest uppercase">
              <Database className="w-4 h-4" />
              <h2 className="text-sm">ARCHIVED_ACQUISITIONS</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="border border-primary/20 bg-background/50 p-4 hover:border-primary/50 transition-all cursor-pointer group hover:bg-primary/5 relative"
                  onClick={() => {
                    setTargetUrl(item.url);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  data-testid={`history-item-${item.id}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-muted-foreground font-mono truncate max-w-[70%]" title={item.url}>
                      {item.url}
                    </div>
                    <Badge variant="outline" className="text-[10px] rounded-none border-primary/30 text-primary py-0">
                      {item.totalAssets} ASSETS
                    </Badge>
                  </div>
                  <div className="font-bold text-foreground group-hover:text-primary transition-colors truncate mb-3" title={item.title}>
                    {item.title || 'UNKNOWN_TARGET'}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono flex items-center justify-between">
                    <span>ID: {item.id.toString().padStart(4, '0')}</span>
                    <span>{format(new Date(item.clonedAt), "MMM dd, yyyy HH:mm")}</span>
                  </div>
                  
                  {/* Decorative corner */}
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
