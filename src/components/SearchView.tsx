"use client";

import {
  AlertCircle,
  ArrowRight,
  Clock,
  Database,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn, formatDate, formatTime, kindLabel, sourceById } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import { suggestedSearches } from "@/lib/mock/graph";
import type { SearchResult, SearchSort, Source, SourceKind } from "@/lib/types";
import {
  Badge,
  Button,
  Dropdown,
  EmptyState,
  PageHeader,
  Segmented,
} from "@/components/ui";

/**
 * Field-weighted lexical scoring for keyword mode.
 */
function scoreSource(
  query: string,
  source: { id: string; title: string; excerpt: string; tags: string[] },
) {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
  if (!words.length) return 0;

  const title = source.title.toLowerCase();
  const tags = source.tags.join(" ").toLowerCase();
  const body = source.excerpt.toLowerCase();

  let total = 0;
  words.forEach((w) => {
    const stem = w.slice(0, Math.max(4, w.length - 2));
    if (title.includes(stem)) total += 1;
    else if (tags.includes(stem)) total += 0.8;
    else if (body.includes(stem)) total += 0.55;
  });

  const coverage = total / words.length;
  if (coverage === 0) return 0;

  const jitter =
    ([...source.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 7) / 100;
  return Math.min(0.97, coverage * 0.9 + jitter);
}

function buildKeywordResults(query: string, sources: Source[]): SearchResult[] {
  if (!query.trim()) return [];
  const raw = sources
    .map((s) => ({ source: s, s: scoreSource(query, s) }))
    .filter((r) => r.s > 0.18)
    .sort((a, b) => b.s - a.s)
    .slice(0, 10);

  const top = raw[0]?.s ?? 1;
  return raw.map((r) => ({
    id: `kw_${r.source.id}`,
    sourceId: r.source.id,
    title: r.source.title,
    excerpt: r.source.excerpt,
    relevance: Math.min(0.97, 0.62 + (r.s / top) * 0.35),
    page: r.source.pages
      ? Math.max(1, Math.round((r.s / top) * r.source.pages))
      : undefined,
    collection: r.source.collection,
    kind: r.source.kind,
  }));
}

function RelevanceBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value * 100)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-white"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10.5px] tabular-nums text-faint font-mono">
        {pct}%
      </span>
    </div>
  );
}

export function SearchView() {
  const sources = useRecall((s) => s.sources);
  const history = useRecall((s) => s.searchHistory);
  const pushHistory = useRecall((s) => s.pushSearchHistory);
  const clearHistory = useRecall((s) => s.clearSearchHistory);
  const setActiveChat = useRecall((s) => s.setActiveChat);
  const chats = useRecall((s) => s.chats);

  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [mode, setMode] = useState<"semantic" | "keyword">("semantic");
  const [sort, setSort] = useState<SearchSort>("relevance");
  const [collection, setCollection] = useState("All");
  const [threshold, setThreshold] = useState(0.35);

  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);

  // Embedding Status & Backfill state
  const [embeddingStatus, setEmbeddingStatus] = useState<{
    totalChunks: number;
    readyChunks: number;
    pendingChunks: number;
    failedChunks: number;
    hasConsent: boolean;
    isConfigured: boolean;
    model: string;
    dimensions: number;
  } | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [updatingConsent, setUpdatingConsent] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  const loadEmbeddingStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/embeddings/status");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) setEmbeddingStatus(data);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch("/api/embeddings/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) {
          setEmbeddingStatus(data);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  const collections = useMemo(
    () => ["All", ...Array.from(new Set(sources.map((s) => s.collection)))],
    [sources],
  );

  // Execute Semantic or Keyword Search
  const executeSearch = useCallback(
    async (queryText: string, currentMode: "semantic" | "keyword") => {
      const trimmed = queryText.trim();
      if (!trimmed) {
        setSubmitted("");
        setSemanticResults([]);
        return;
      }

      setSubmitted(trimmed);
      setSearchError(null);

      if (currentMode === "keyword") {
        const kwResults = buildKeywordResults(trimmed, sources);
        setSemanticResults(kwResults);
        pushHistory(trimmed, kwResults.length);
        return;
      }

      // Semantic Vector Search
      setLoading(true);
      try {
        const res = await fetch("/api/search/semantic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: trimmed,
            limit: 20,
            threshold,
          }),
        });

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Server returned an invalid response.");
        }

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Semantic search failed.");
        }

        const mapped: SearchResult[] = (data.results || []).map(
          (r: {
            chunkId: string;
            sourceId: string | null;
            noteId: string | null;
            content: string;
            similarity: number;
            pageNumber: number | null;
            sourceTitle: string;
            sourceType: string;
            collectionName: string;
          }) => ({
            id: r.chunkId,
            sourceId: r.sourceId || r.noteId || r.chunkId,
            title: r.sourceTitle,
            excerpt: r.content,
            relevance: r.similarity,
            page: r.pageNumber || undefined,
            collection: r.collectionName || "General",
            kind: (r.sourceType === "note" ? "note" : r.sourceType === "link" ? "link" : "pdf") as SourceKind,
          }),
        );

        setSemanticResults(mapped);
        pushHistory(trimmed, mapped.length);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Search failed";
        setSearchError(msg);
        setSemanticResults([]);
      } finally {
        setLoading(false);
      }
    },
    [sources, threshold, pushHistory],
  );

  const runSearch = (query: string) => {
    const trimmed = query.trim();
    setInput(trimmed);
    executeSearch(trimmed, mode);
  };

  const handleToggleConsent = async () => {
    if (!embeddingStatus) return;
    setUpdatingConsent(true);
    setBackfillMessage(null);
    try {
      const nextConsent = !embeddingStatus.hasConsent;
      const res = await fetch("/api/embeddings/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: nextConsent }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setEmbeddingStatus((prev) => (prev ? { ...prev, hasConsent: nextConsent } : null));
        setBackfillMessage(
          nextConsent
            ? "Consent granted for Google Gemini embeddings."
            : "Consent withdrawn. External embedding generation paused."
        );
        await loadEmbeddingStatus();
      } else {
        setBackfillMessage(data?.error || "Failed to update consent setting.");
      }
    } catch {
      setBackfillMessage("Network error while updating consent.");
    } finally {
      setUpdatingConsent(false);
    }
  };

  const handleBackfill = async () => {
    if (!embeddingStatus?.hasConsent) {
      setBackfillMessage("Explicit user consent is required before generating Gemini embeddings. Please click 'Enable Gemini' first.");
      return;
    }
    setBackfilling(true);
    setBackfillMessage(null);
    try {
      const res = await fetch("/api/embeddings/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 50 }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setBackfillMessage(`Embedded ${data.succeeded || 0} chunks successfully.`);
        await loadEmbeddingStatus();
      } else {
        setBackfillMessage(data?.error || "Backfill failed.");
      }
    } catch {
      setBackfillMessage("Backfill request encountered a network error.");
    } finally {
      setBackfilling(false);
    }
  };

  // Filter and sort displayed results
  const filteredResults = useMemo(() => {
    const base = semanticResults;
    const filtered =
      collection === "All"
        ? base
        : base.filter((r) => r.collection === collection);

    const sorted = [...filtered];
    if (sort === "relevance") {
      sorted.sort((a, b) => b.relevance - a.relevance);
    } else if (sort === "recent") {
      sorted.sort((a, b) => {
        const sa = sourceById(sources, a.sourceId);
        const sb = sourceById(sources, b.sourceId);
        return (sb?.uploadedAt ?? "").localeCompare(sa?.uploadedAt ?? "");
      });
    } else if (sort === "title") {
      sorted.sort((a, b) => {
        const titleA = a.title || sourceById(sources, a.sourceId)?.title || "";
        const titleB = b.title || sourceById(sources, b.sourceId)?.title || "";
        return titleA.localeCompare(titleB);
      });
    }
    return sorted;
  }, [semanticResults, collection, sort, sources]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        breadcrumbs={["Workspace", "Semantic search"]}
        title="Semantic search"
        description="Searches conceptual meaning rather than exact strings using 1536-dimensional pgvector cosine distance embeddings."
      />

      {/* Embedding Status & Privacy Banner */}
      <div className="px-7 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3.5 py-2.5 text-[12px]">
          <div className="flex flex-wrap items-center gap-2 text-muted">
            <Database className="h-4 w-4 text-violet-400" />
            <span>
              Engine: <strong className="text-ink font-medium">Google Gemini ({embeddingStatus?.model || "gemini-embedding-2"})</strong>
            </span>
            <span className="text-white/20">·</span>
            {embeddingStatus ? (
              <>
                <span className="text-faint">
                  {embeddingStatus.readyChunks} embedded
                  {embeddingStatus.pendingChunks > 0 && ` (${embeddingStatus.pendingChunks} pending)`}
                </span>
                <span className="text-white/20">·</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                    embeddingStatus.hasConsent
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-300 border border-amber-500/20",
                  )}
                >
                  {embeddingStatus.hasConsent ? "Consent Granted" : "Consent Required"}
                </span>
              </>
            ) : (
              <span className="text-faint">Loading vector index...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={embeddingStatus?.hasConsent ? "ghost" : "secondary"}
              onClick={handleToggleConsent}
              disabled={updatingConsent}
            >
              {updatingConsent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Shield className="h-3.5 w-3.5 text-violet-400" />
              )}
              <span>{embeddingStatus?.hasConsent ? "Withdraw Consent" : "Enable Gemini"}</span>
            </Button>

            {embeddingStatus?.pendingChunks ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleBackfill}
                disabled={backfilling || !embeddingStatus.isConfigured || !embeddingStatus.hasConsent}
              >
                {backfilling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Backfill Vectors ({embeddingStatus.pendingChunks})</span>
              </Button>
            ) : null}

            <button
              onClick={() => setShowPrivacyNotice(!showPrivacyNotice)}
              className="flex items-center gap-1 text-[11px] text-faint hover:text-ink transition"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Privacy & Model Details</span>
            </button>
          </div>
        </div>

        {/* Expandable Privacy Disclosure */}
        {showPrivacyNotice && (
          <div className="mt-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-3.5 text-[11.5px] leading-relaxed text-muted">
            <div className="flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-semibold text-ink">Google Gemini Embedding Privacy & Data Handling</p>
                <p>
                  To enable high-dimensional semantic search, document passages are formatted and sent to the configured Google Gemini API (model: <code>gemini-embedding-2</code>) to generate 1536-dimensional floating-point vectors. Search queries are likewise formatted as <code>task: search result | query: ...</code> and vectorized.
                </p>
                <p>
                  Vectors are persisted securely in your private PostgreSQL database using <code>pgvector</code> with an HNSW cosine index, protected by Supabase Row Level Security.
                </p>
                <p className="text-faint">
                  <strong>Notice on Free-Tier Usage:</strong> Under Google&apos;s standard terms for free-tier Gemini API usage, submitted content may be processed by Google to improve its models. RECALL requires your explicit opt-in consent before sending any document chunks or queries to Gemini. You can withdraw consent at any time using the toggle above to stop all external processing and use Lexical Keyword search.
                </p>
              </div>
            </div>
          </div>
        )}

        {backfillMessage && (
          <p className="mt-1 text-[11px] text-violet-300">{backfillMessage}</p>
        )}
      </div>

      {/* Search input */}
      <div className="px-7 pt-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch(input, mode);
          }}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-white/25"
        >
          <Search className="h-4 w-4 shrink-0 text-faint" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search ideas, concepts, notes, and research passages..."
            className="w-full bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
          />
          {input && (
            <button
              type="button"
              onClick={() => {
                setInput("");
                setSubmitted("");
                setSemanticResults([]);
              }}
              aria-label="Clear query"
              className="text-faint hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Segmented
            value={mode}
            onChange={(val) => {
              setMode(val);
              if (submitted) executeSearch(submitted, val);
            }}
            options={[
              { value: "semantic", label: "Semantic Vector" },
              { value: "keyword", label: "Keyword" },
            ]}
          />
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>
      </div>

      {/* Filters and Similarity Threshold */}
      <div className="flex flex-wrap items-center gap-2 px-7 pt-3">
        <Dropdown
          label="Filter by collection"
          value={collection}
          onChange={setCollection}
          options={collections.map((c) => ({
            value: c,
            label: c === "All" ? "All collections" : c,
          }))}
        />
        <Dropdown
          label="Sort results"
          value={sort}
          onChange={setSort}
          options={[
            { value: "relevance", label: "Highest similarity" },
            { value: "recent", label: "Most recent" },
            { value: "title", label: "Title A–Z" },
          ]}
        />
        <Dropdown
          label="Match threshold"
          value={String(threshold)}
          onChange={(val) => {
            const num = parseFloat(val);
            setThreshold(num);
            if (submitted && mode === "semantic") {
              executeSearch(submitted, "semantic");
            }
          }}
          options={[
            { value: "0.25", label: "Broad (25%+)" },
            { value: "0.35", label: "Balanced (35%+)" },
            { value: "0.50", label: "Strict (50%+)" },
            { value: "0.70", label: "Very Strict (70%+)" },
          ]}
        />

        <Badge tone={mode === "semantic" ? "neutral" : "outline"}>
          <Sparkles className="h-2.5 w-2.5" />
          {mode === "semantic" ? "pgvector HNSW (Gemini)" : "Lexical Index"}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5 scroll-thin">
        {searchError && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-[12.5px] text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold text-red-300">Search Error</p>
              <p className="mt-0.5 text-red-200/90">{searchError}</p>
            </div>
          </div>
        )}

        {!submitted ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Suggested */}
            <section>
              <h2 className="mb-2 text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Suggested searches
              </h2>
              <div className="space-y-1.5">
                {suggestedSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => runSearch(s)}
                    className="group flex w-full items-center gap-2 rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2.5 text-left text-[12.5px] text-muted backdrop-blur-md transition hover:border-white/20 hover:text-ink"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-faint" />
                    <span className="flex-1">{s}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </section>

            {/* History */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                  Recent searches
                </h2>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[10.5px] text-faint transition hover:text-ink"
                  >
                    Clear
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <EmptyState
                  icon={<Clock className="h-5 w-5" />}
                  title="No searches yet"
                  description="Queries you run will show up here."
                />
              ) : (
                <div className="space-y-1">
                  {history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => runSearch(h.query)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-white/[0.05]"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-faint" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                        {h.query}
                      </span>
                      <span className="shrink-0 text-[10.5px] text-faint">
                        {h.resultCount} · {formatTime(h.at)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : loading ? (
          <div className="grid place-items-center py-20 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-violet-400 mb-3" />
            <p className="text-[13px] font-medium text-ink">Searching knowledge vectors...</p>
            <p className="text-[11.5px] text-faint mt-1">Generating query embedding and querying HNSW index.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-[11px] uppercase tracking-[0.08em] text-faint">
              {filteredResults.length} passage{filteredResults.length === 1 ? "" : "s"} · ranked
              by {mode === "semantic" ? "cosine vector" : "lexical"} similarity
            </p>

            {filteredResults.length === 0 ? (
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="No passage clears the threshold"
                description={
                  mode === "semantic"
                    ? "Try lowering the match threshold or broadening your search query."
                    : "Try a broader phrasing, or drop the collection filter."
                }
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setCollection("All");
                      setThreshold(0.25);
                      if (mode === "semantic") executeSearch(submitted, "semantic");
                    }}
                  >
                    Broaden Search
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {filteredResults.map((r, i) => {
                  const src = sourceById(sources, r.sourceId);
                  const displayTitle = r.title || src?.title || "Knowledge Passage";
                  const displayKind = r.kind || src?.kind || "pdf";

                  return (
                    <article
                      key={r.id}
                      className="group rounded-xl border border-white/[0.07] bg-black/35 p-3.5 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[0.08] text-[10px] font-semibold text-muted">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-faint" />
                            <p className="truncate text-[12.5px] font-medium text-ink">
                              {displayTitle}
                            </p>
                            <Badge tone="muted">{kindLabel[displayKind]}</Badge>
                            {r.page && (
                              <span className="shrink-0 rounded bg-white/[0.08] px-1.5 py-px text-[10px] text-faint">
                                p.{r.page}
                              </span>
                            )}
                          </div>

                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted line-clamp-4">
                            {r.excerpt}
                          </p>

                          <div className="mt-2.5 flex flex-wrap items-center gap-3">
                            <RelevanceBar value={r.relevance} />
                            <span className="text-[10.5px] text-faint">
                              {r.collection} {src?.uploadedAt && `· ${formatDate(src.uploadedAt)}`}
                            </span>
                            <button
                              onClick={() => {
                                const chat = chats[0];
                                if (chat) setActiveChat(chat.id);
                              }}
                              className="ml-auto flex items-center gap-1 text-[10.5px] text-faint opacity-0 transition hover:text-white group-hover:opacity-100"
                            >
                              Open in chat <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
