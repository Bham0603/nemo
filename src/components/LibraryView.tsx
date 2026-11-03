"use client";

import {
  AlertCircle,
  Check,
  ExternalLink,
  FileText,
  Grid2x2,
  Link2,
  List,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn, formatDate, kindLabel, kindTint } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import type { Source, SourceKind } from "@/lib/types";
import {
  Badge,
  Button,
  Dialog,
  Dropdown,
  EmptyState,
  PageHeader,
  Segmented,
} from "@/components/ui";

const ACCEPTED = [".pdf", ".docx", ".txt", ".md"];
const MAX_BYTES = 25 * 1024 * 1024;

type SortKey = "recent" | "oldest" | "name" | "size";
type TypeFilter = "all" | SourceKind;

function KindBadge({ kind }: { kind: Source["kind"] }) {
  return (
    <div
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[8.5px] font-bold tracking-wide text-ink",
        kindTint[kind],
      )}
    >
      {kindLabel[kind]}
    </div>
  );
}

function StatusPill({ status }: { status: Source["status"] }) {
  if (status === "processing") {
    return (
      <span className="flex items-center gap-1.5 rounded-md bg-white/[0.08] px-2 py-1 text-[10.5px] font-medium text-muted">
        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white/60" />
        Indexing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="rounded-md border border-white/15 px-2 py-1 text-[10.5px] font-medium text-faint">
        Needs OCR
      </span>
    );
  }
  return (
    <span className="rounded-md bg-white/[0.08] px-2 py-1 text-[10.5px] font-medium text-muted">
      Ready
    </span>
  );
}

export function LibraryView() {
  const { user } = useAuth();
  const sources = useRecall((s) => s.sources);
  const setSources = useRecall((s) => s.setSources);
  const removeSources = useRecall((s) => s.removeSources);

  const [q, setQ] = useState("");
  const [collection, setCollection] = useState("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [layout, setLayout] = useState<"list" | "grid">("list");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [retrying, setRetrying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [drawerData, setDrawerData] = useState<{
    signedUrl: string | null;
    chunks: Array<{ chunk_index: number; content: string; page_number: number | null }>;
    chunkCount: number;
    loading: boolean;
  }>({ signedUrl: null, chunks: [], chunkCount: 0, loading: false });

  // Load user sources from Supabase
  const loadSources = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/sources");
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          if (data && Array.isArray(data.sources) && data.sources.length > 0) {
            setSources(data.sources);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load sources from server", err);
    }
  }, [user, setSources]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      try {
        const res = await fetch("/api/sources");
        if (res.ok && mounted) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await res.json().catch(() => null);
            if (data && Array.isArray(data.sources) && data.sources.length > 0) {
              setSources(data.sources);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load sources", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, setSources]);

  // Load drawer preview & chunks when document is opened
  useEffect(() => {
    if (!detailId) return;
    let active = true;

    async function fetchDrawerData() {
      try {
        const r = await fetch(`/api/sources/${detailId}`);
        if (r.ok) {
          const contentType = r.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await r.json().catch(() => null);
            if (!active) return;
            if (data?.source) {
              setDrawerData({
                signedUrl: data.signedUrl || null,
                chunks: data.chunks || [],
                chunkCount: data.chunkCount || 0,
                loading: false,
              });
              return;
            }
          }
        }
        if (active) {
          setDrawerData({ signedUrl: null, chunks: [], chunkCount: 0, loading: false });
        }
      } catch {
        if (active) {
          setDrawerData({ signedUrl: null, chunks: [], chunkCount: 0, loading: false });
        }
      }
    }

    fetchDrawerData();

    return () => {
      active = false;
    };
  }, [detailId]);

  const collections = useMemo(
    () => ["All", ...Array.from(new Set(sources.map((s) => s.collection)))],
    [sources],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = sources.filter((s) => {
      const matchesTerm =
        !term ||
        s.title.toLowerCase().includes(term) ||
        s.tags.some((t) => t.toLowerCase().includes(term)) ||
        s.excerpt.toLowerCase().includes(term);
      const matchesCollection =
        collection === "All" || s.collection === collection;
      const matchesType = typeFilter === "all" || s.kind === typeFilter;
      return matchesTerm && matchesCollection && matchesType;
    });

    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "oldest")
        return a.uploadedAt.localeCompare(b.uploadedAt);
      if (sort === "size") {
        const num = (s: Source) => parseFloat(s.sizeLabel) || 0;
        return num(b) - num(a);
      }
      return b.uploadedAt.localeCompare(a.uploadedAt);
    });
    return sorted;
  }, [sources, q, collection, typeFilter, sort]);

  const detail = sources.find((s) => s.id === detailId) ?? null;

  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleFiles = async (files: FileList | null) => {
    setUploadError(null);
    setUploadNote(null);
    if (!files || files.length === 0) return;

    if (!user) {
      setUploadNote("Guest mode: Sign in to upload and chunk documents with Supabase.");
      return;
    }

    setUploading(true);
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      if (!ACCEPTED.includes(ext)) {
        errors.push(`${file.name}: unsupported format`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name}: exceeds 25 MB limit`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("collection", collection === "All" ? "Research" : collection);

        const res = await fetch("/api/ingest/upload", {
          method: "POST",
          body: formData,
        });

        let data: { error?: string; success?: boolean; source?: unknown; chunksCount?: number } | null = null;
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          try {
            data = await res.json();
          } catch {
            data = null;
          }
        }

        if (!res.ok) {
          const errMsg =
            data?.error ||
            (res.status === 401
              ? "Authentication required. Please sign in."
              : res.status === 413
                ? "File exceeds server upload payload size."
                : `Upload failed (HTTP ${res.status}: ${res.statusText || "Server error"})`);
          errors.push(`${file.name}: ${errMsg}`);
        } else if (data?.success) {
          successCount++;
        } else {
          errors.push(`${file.name}: Unexpected response from server.`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error";
        errors.push(`${file.name}: ${msg}`);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      setUploadNote(`Successfully ingested ${successCount} document${successCount > 1 ? "s" : ""}.`);
      await loadSources();
    }
    if (errors.length > 0) {
      setUploadError(errors.join(" · "));
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setUploadError(null);
    setUploadNote(null);

    if (!user) {
      setUploadNote("Guest mode: Sign in to import and chunk website URLs with Supabase.");
      return;
    }

    setUploading(true);
    try {
      const res = await fetch("/api/ingest/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput.trim(),
          collection: collection === "All" ? "Research" : collection,
        }),
      });

      let data: { error?: string; source?: { title: string }; chunksCount?: number } | null = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        setUploadError(
          data?.error ||
          (res.status === 401
            ? "Authentication required. Please sign in."
            : `Failed to ingest website (HTTP ${res.status}).`)
        );
      } else if (data?.source) {
        setUrlInput("");
        setUploadNote(`Website '${data.source.title}' successfully ingested and chunked (${data.chunksCount || 0} chunks).`);
        await loadSources();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setUploadError(`Failed to connect: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (sourceId: string) => {
    setRetrying(true);
    try {
      const res = await fetch("/api/ingest/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });

      let data: { error?: string; success?: boolean } | null = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (res.ok && data?.success) {
        await loadSources();
        const r = await fetch(`/api/sources/${sourceId}`);
        if (r.ok) {
          const d = await r.json().catch(() => null);
          if (d?.source) {
            setDrawerData({
              signedUrl: d.signedUrl || null,
              chunks: d.chunks || [],
              chunkCount: d.chunkCount || 0,
              loading: false,
            });
          }
        }
      } else {
        setUploadError(data?.error || `Retry failed (HTTP ${res.status}).`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to retry ingestion";
      setUploadError(msg);
    } finally {
      setRetrying(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (user) {
      for (const id of ids) {
        try {
          await fetch(`/api/sources/${id}`, { method: "DELETE" });
        } catch (err) {
          console.error("Delete failed for source", id, err);
        }
      }
    }
    removeSources(ids);
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
    if (detailId && ids.includes(detailId)) {
      setDetailId(null);
    }
    setConfirmDelete(null);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          breadcrumbs={["Workspace", "Library"]}
          title="Library"
          description={`${sources.length} sources · ${sources.filter((s) => s.status === "ready").length} indexed. Demonstration data — nothing here is actually uploaded.`}
          actions={
            <>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-3.5 w-3.5" /> Upload
              </Button>
              <Button variant="primary" onClick={() => setUploadOpen(true)}>
                Add source
              </Button>
            </>
          }
        />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 px-7 pb-4">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition focus-within:border-white/25">
            <Search className="h-3.5 w-3.5 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, tag, or excerpt…"
              className="w-full bg-transparent text-[12.5px] placeholder:text-faint focus:outline-none"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="text-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Dropdown
            label="Filter by file type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "All types" },
              { value: "pdf", label: "PDF" },
              { value: "docx", label: "DOCX" },
              { value: "txt", label: "TXT" },
              { value: "markdown", label: "Markdown" },
              { value: "link", label: "Links" },
              { value: "note", label: "Notes" },
            ]}
          />

          <Dropdown
            label="Sort documents"
            value={sort}
            onChange={setSort}
            options={[
              { value: "recent", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "name", label: "Name A–Z" },
              { value: "size", label: "Largest first" },
            ]}
          />

          <Segmented
            value={layout}
            onChange={setLayout}
            options={[
              { value: "list", label: "", icon: <List className="h-3.5 w-3.5" /> },
              {
                value: "grid",
                label: "",
                icon: <Grid2x2 className="h-3.5 w-3.5" />,
              },
            ]}
          />
        </div>

        {/* Collection chips */}
        <div className="flex flex-wrap items-center gap-1.5 px-7 pb-4">
          {collections.map((c) => (
            <button
              key={c}
              onClick={() => setCollection(c)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition",
                collection === c
                  ? "bg-white/[0.12] text-ink"
                  : "text-faint hover:bg-white/[0.05] hover:text-muted",
              )}
            >
              {c}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-faint">
            {filtered.length} shown
          </span>
        </div>

        {/* Bulk action bar */}
        {selected.length > 0 && (
          <div className="mx-7 mb-3 flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2">
            <span className="text-[12px] text-ink/90">
              {selected.length} selected
            </span>
            <Button size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="danger"
              className="ml-auto"
              onClick={() => setConfirmDelete(selected)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        )}

        {/* Document list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 scroll-thin">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="Nothing matches those filters"
              description="Try a broader search term, or clear the type and collection filters."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setQ("");
                    setTypeFilter("all");
                    setCollection("All");
                  }}
                >
                  Reset filters
                </Button>
              }
            />
          ) : layout === "list" ? (
            <div className="overflow-hidden rounded-xl border border-white/[0.07]">
              {filtered.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    "group flex items-center gap-3 bg-black/30 px-3.5 py-3 transition hover:bg-white/[0.05]",
                    i !== 0 && "border-t border-white/[0.05]",
                    selected.includes(s.id) && "bg-white/[0.07]",
                  )}
                >
                  <button
                    onClick={() => toggleSelect(s.id)}
                    aria-label={`Select ${s.title}`}
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition",
                      selected.includes(s.id)
                        ? "border-white/40 bg-white text-black"
                        : "border-white/20 hover:border-white/40",
                    )}
                  >
                    {selected.includes(s.id) && (
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    )}
                  </button>

                  <button
                    onClick={() => setDetailId(s.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <KindBadge kind={s.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {s.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-faint">
                        {s.collection} · {s.sizeLabel}
                        {s.pages ? ` · ${s.pages} pages` : ""} ·{" "}
                        {formatDate(s.uploadedAt)}
                      </p>
                    </div>
                    <div className="hidden max-w-[280px] flex-1 xl:block">
                      <p className="line-clamp-1 text-[11.5px] text-muted/80">
                        {s.excerpt}
                      </p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <StatusPill status={s.status} />
                    <button
                      onClick={() => setConfirmDelete([s.id])}
                      aria-label={`Delete ${s.title}`}
                      className="rounded-md p-1.5 text-faint opacity-0 transition hover:bg-white/10 hover:text-ink group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "group flex flex-col rounded-xl border border-white/[0.07] bg-black/35 p-3.5 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.05]",
                    selected.includes(s.id) && "border-white/25 bg-white/[0.07]",
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => toggleSelect(s.id)}
                      aria-label={`Select ${s.title}`}
                      className={cn(
                        "mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition",
                        selected.includes(s.id)
                          ? "border-white/40 bg-white text-black"
                          : "border-white/20 hover:border-white/40",
                      )}
                    >
                      {selected.includes(s.id) && (
                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      )}
                    </button>
                    <KindBadge kind={s.kind} />
                    <button
                      onClick={() => setDetailId(s.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-[12.5px] font-medium">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-faint">
                        {s.sizeLabel} · {formatDate(s.uploadedAt)}
                      </p>
                    </button>
                  </div>

                  <p className="mt-2.5 line-clamp-3 text-[11.5px] leading-relaxed text-muted/85">
                    {s.excerpt}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1">
                    {s.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-faint"
                      >
                        {t}
                      </span>
                    ))}
                    <span className="ml-auto">
                      <StatusPill status={s.status} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/[0.06] bg-black/25 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-2 px-5 pb-3 pt-6">
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Document
              </p>
              <h2 className="mt-1 text-[14px] font-semibold leading-snug">
                {detail.title}
              </h2>
            </div>
            <button
              onClick={() => setDetailId(null)}
              aria-label="Close detail panel"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white/10 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 scroll-thin">
            {/* Original Document / Signed URL Preview */}
            {drawerData.signedUrl ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <FileText className="h-6 w-6 text-purple-400" />
                <p className="text-[12px] font-medium text-ink">Original Stored Document</p>
                <a
                  href={drawerData.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-ink transition hover:bg-white/20"
                >
                  <ExternalLink className="h-3 w-3" /> View / Download File
                </a>
              </div>
            ) : detail.kind === "link" ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <Link2 className="h-6 w-6 text-sky-400" />
                <p className="text-[12px] font-medium text-ink">Ingested Webpage</p>
                <span className="text-[10.5px] text-faint truncate max-w-[240px]">
                  {detail.title}
                </span>
              </div>
            ) : (
              <div className="flex h-[130px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/12 bg-white/[0.02]">
                <FileText className="h-6 w-6 text-faint" />
                <p className="text-[11px] text-faint">Document Record</p>
                <p className="max-w-[200px] text-center text-[10px] leading-relaxed text-faint/70">
                  {detail.collection} · {detail.sizeLabel}
                </p>
              </div>
            )}

            {/* Error & Retry Banner for Failed Ingestion */}
            {detail.status === "failed" && (
              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <div className="flex items-start gap-2 text-red-400 text-[11.5px]">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Ingestion Notice</p>
                    <p className="mt-0.5 text-[10.5px] text-red-300/80 leading-relaxed">
                      {detail.errorMessage || "Text extraction could not find an extractable text layer."}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2.5 w-full text-[11px]"
                  disabled={retrying}
                  onClick={() => handleRetry(detail.id)}
                >
                  {retrying ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Retrying...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1.5" /> Retry Ingestion
                    </>
                  )}
                </Button>
              </div>
            )}

            <dl className="mt-4 space-y-2">
              {[
                ["Type", kindLabel[detail.kind]],
                ["Collection", detail.collection],
                ["Size", detail.sizeLabel],
                ["Pages", detail.pages ? String(detail.pages) : "—"],
                ["Words", detail.words ? detail.words.toLocaleString() : "—"],
                ["Added", formatDate(detail.uploadedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between">
                  <dt className="text-[11.5px] text-faint">{k}</dt>
                  <dd className="text-[11.5px] text-ink/85">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Status
              </p>
              <div className="mt-1.5">
                <StatusPill status={detail.status} />
              </div>
            </div>

            {/* Knowledge Chunks Preview */}
            {drawerData.loading ? (
              <div className="mt-4 flex items-center justify-center py-6 text-faint text-[11px]">
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading chunks preview...
              </div>
            ) : drawerData.chunks.length > 0 ? (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                    Knowledge Chunks ({drawerData.chunkCount})
                  </p>
                  <span className="text-[10px] text-faint">Normalized</span>
                </div>
                <div className="mt-2 space-y-2">
                  {drawerData.chunks.slice(0, 6).map((c) => (
                    <div
                      key={c.chunk_index}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-[11px]"
                    >
                      <div className="mb-1 flex items-center justify-between text-[10px] text-faint">
                        <span className="font-mono">Chunk #{c.chunk_index + 1}</span>
                        {c.page_number && (
                          <span className="rounded bg-white/10 px-1 py-0.5 text-[9px]">
                            Page {c.page_number}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-3 text-muted leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  ))}
                  {drawerData.chunkCount > 6 && (
                    <p className="text-center text-[10.5px] text-faint py-1">
                      + {drawerData.chunkCount - 6} more chunks in database
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Excerpt
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                &ldquo;{detail.excerpt}&rdquo;
              </p>
            </div>

            <div className="mt-4">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Tags
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {detail.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-faint"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Collections
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                <Badge>{detail.collection}</Badge>
                <Badge tone="outline">
                  <Link2 className="h-2.5 w-2.5" /> 2 chats
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] p-4">
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setConfirmDelete([detail.id])}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete document
            </Button>
          </div>
        </aside>
      )}

      {/* Upload dialog */}
      <Dialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setUploadError(null);
          setUploadNote(null);
        }}
        title="Add a source"
        description="PDF, DOCX, TXT, Markdown, or a website link. Validated and processed into normalized knowledge chunks."
        footer={
          <>
            <Button onClick={() => setUploadOpen(false)}>Close</Button>
            <Button
              variant="primary"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Ingesting...
                </>
              ) : (
                "Choose files"
              )}
            </Button>
          </>
        }
      >
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center transition",
            uploading && "opacity-60 pointer-events-none",
          )}
        >
          {uploading ? (
            <div className="py-2">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-purple-400" />
              <p className="mt-2 text-[12.5px] font-medium text-ink">
                Ingesting document & generating knowledge chunks...
              </p>
              <p className="mt-1 text-[11px] text-faint">
                Uploading to secure storage and extracting text
              </p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-5 w-5 text-faint" />
              <p className="mt-2 text-[12.5px] text-ink/85">
                Drop files here, or choose them below
              </p>
              <p className="mt-1 text-[11px] text-faint">
                {ACCEPTED.join(", ")} · up to 25 MB each
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-medium text-muted">Or add a website link</p>
          <form onSubmit={handleAddUrl} className="mt-1.5 flex gap-1.5">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={uploading}
              placeholder="https://example.com/article"
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] placeholder:text-faint focus:border-white/25 focus:outline-none"
            />
            <Button type="submit" size="sm" disabled={uploading || !urlInput.trim()}>
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Add URL"
              )}
            </Button>
          </form>
        </div>

        {uploadError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-[11.5px] text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{uploadError}</p>
          </div>
        )}
        {uploadNote && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-2 text-[11.5px] text-emerald-300">
            <Check className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{uploadNote}</p>
          </div>
        )}
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={
          confirmDelete && confirmDelete.length > 1
            ? `Delete ${confirmDelete.length} documents?`
            : "Delete this document?"
        }
        description="This permanently removes the source document, stored file, and all associated knowledge chunks."
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) {
                  handleDelete(confirmDelete);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
