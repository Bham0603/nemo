"use client";

import {
  FileText,
  Maximize2,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn, sourceById } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import type { ConceptNode } from "@/lib/types";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";

const NODE_R: Record<ConceptNode["kind"], number> = {
  concept: 8,
  document: 6,
  note: 6,
};

export function ConnectionsView() {
  const nodes = useRecall((s) => s.nodes);
  const edges = useRecall((s) => s.edges);
  const sources = useRecall((s) => s.sources);
  const selected = useRecall((s) => s.selectedNodeId);
  const setSelected = useRecall((s) => s.setSelectedNode);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return nodes;
    return nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(term) ||
        n.summary.toLowerCase().includes(term),
    );
  }, [nodes, query]);

  const visibleIds = useMemo(() => new Set(visible.map((n) => n.id)), [visible]);

  const neighbours = useMemo(() => {
    if (!selected) return [];
    return edges
      .filter((e) => e.fromId === selected || e.toId === selected)
      .map((e) => ({
        edge: e,
        node: nodes.find(
          (n) => n.id === (e.fromId === selected ? e.toId : e.fromId),
        ),
      }))
      .filter((x) => x.node);
  }, [selected, edges, nodes]);

  const activeNode = nodes.find((n) => n.id === selected) ?? null;

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          breadcrumbs={["Workspace", "Connections"]}
          title="Knowledge connections"
          description={`${edges.length} relationships across ${nodes.length} concepts. Drag to pan, scroll to zoom, click a node to isolate its neighbourhood.`}
          actions={
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} title="Zoom out">
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-9 text-center text-[11px] tabular-nums text-faint">
                {Math.round(zoom * 100)}%
              </span>
              <Button size="sm" onClick={() => setZoom((z) => Math.min(2.2, z + 0.15))} title="Zoom in">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={reset} title="Reset view">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        />

        <div className="px-7 pb-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition focus-within:border-white/25">
            <Search className="h-3.5 w-3.5 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search connected concepts…"
              className="w-full bg-transparent text-[12.5px] placeholder:text-faint focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear concept search"
                className="text-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 px-7 pb-6">
          <div
            className="relative h-full w-full cursor-grab overflow-hidden rounded-xl border border-white/[0.07] bg-black/40 backdrop-blur-md active:cursor-grabbing"
            onPointerDown={(e) => {
              dragging.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
            }}
            onPointerMove={(e) => {
              if (!dragging.current) return;
              setPan({
                x: e.clientX - dragging.current.x,
                y: e.clientY - dragging.current.y,
              });
            }}
            onPointerUp={() => {
              dragging.current = null;
            }}
            onPointerLeave={() => {
              dragging.current = null;
            }}
            onWheel={(e) => {
              e.preventDefault();
              setZoom((z) =>
                Math.min(2.2, Math.max(0.5, z - e.deltaY * 0.0012)),
              );
            }}
          >
            {visible.length === 0 ? (
              <EmptyState
                icon={<Search className="h-6 w-6" />}
                title="No concept matches that"
                description="Try a shorter term — the graph is small by design."
              />
            ) : (
              <svg viewBox="0 0 900 520" className="h-full w-full">
                <defs>
                  <radialGradient id="nodeGlow">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <g
                  transform={`translate(${pan.x / zoom} ${pan.y / zoom}) scale(${zoom})`}
                >
                  {/* edges */}
                  {edges.map((e) => {
                    const a = nodes.find((n) => n.id === e.fromId);
                    const b = nodes.find((n) => n.id === e.toId);
                    if (!a || !b) return null;
                    if (!visibleIds.has(a.id) || !visibleIds.has(b.id)) {
                      return null;
                    }
                    const dim =
                      selected && e.fromId !== selected && e.toId !== selected;
                    return (
                      <line
                        key={e.id}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="#ffffff"
                        strokeOpacity={
                          dim ? 0.05 : 0.12 + e.strength * 0.3
                        }
                        strokeWidth={dim ? 0.7 : 0.8 + e.strength * 1.4}
                      />
                    );
                  })}

                  {/* nodes */}
                  {visible.map((n) => {
                    const active = selected === n.id;
                    const isNeighbour = neighbours.some(
                      (x) => x.node?.id === n.id,
                    );
                    const dim = selected && !active && !isNeighbour;
                    const r = NODE_R[n.kind] * (active ? 1.5 : 1);
                    const above = n.y < 260;
                    const labelY = above ? n.y - 15 : n.y + 22;

                    return (
                      <g
                        key={n.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(active ? null : n.id);
                        }}
                        className="cursor-pointer"
                        opacity={dim ? 0.28 : 1}
                      >
                        {(active || isNeighbour) && (
                          <circle
                            cx={n.x}
                            cy={n.y}
                            r={r * 4}
                            fill="url(#nodeGlow)"
                          />
                        )}
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={r}
                          fill={active ? "#ffffff" : "#9a9ca4"}
                          stroke={active ? "#ffffff" : "#3a3c44"}
                          strokeWidth={1.4}
                        />
                        {n.kind !== "concept" && (
                          <circle
                            cx={n.x}
                            cy={n.y}
                            r={r + 3.5}
                            fill="none"
                            stroke="#ffffff"
                            strokeOpacity={0.18}
                            strokeWidth={1}
                          />
                        )}
                        <text
                          x={n.x}
                          y={labelY}
                          textAnchor="middle"
                          fill={active ? "#ffffff" : "#9a9ca4"}
                          style={{
                            fontSize: active ? 10 : 9,
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {n.label.length > 26
                            ? `${n.label.slice(0, 26)}…`
                            : n.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {/* legend */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 backdrop-blur">
              {(
                [
                  ["concept", "Concept"],
                  ["document", "Document"],
                  ["note", "Note"],
                ] as const
              ).map(([kind, label]) => (
                <span
                  key={kind}
                  className="flex items-center gap-1.5 text-[10px] text-faint"
                >
                  <span
                    className={cn(
                      "rounded-full bg-white/70",
                      kind === "concept" ? "h-2 w-2" : "h-1.5 w-1.5",
                    )}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Node detail */}
      {activeNode && (
        <aside className="flex w-[330px] shrink-0 flex-col border-l border-white/[0.06] bg-black/25 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-2 px-5 pb-3 pt-6">
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                {activeNode.kind}
              </p>
              <h2 className="mt-1 text-[14px] font-semibold leading-snug">
                {activeNode.label}
              </h2>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close node detail"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white/10 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 scroll-thin">
            <p className="text-[12px] leading-relaxed text-muted">
              {activeNode.summary}
            </p>

            <div className="mt-4">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Connected to ({neighbours.length})
              </p>
              <div className="mt-1.5 space-y-1">
                {neighbours.map(({ edge, node }) => (
                  <button
                    key={edge.id}
                    onClick={() => setSelected(node!.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink/85">
                      {node!.label}
                    </span>
                    <span className="shrink-0 text-[10px] text-faint">
                      {edge.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Grounded in
              </p>
              <div className="mt-1.5 space-y-1">
                {activeNode.sourceIds.map((id) => {
                  const src = sourceById(sources, id);
                  if (!src) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1.5"
                    >
                      <FileText className="mt-0.5 h-3 w-3 shrink-0 text-faint" />
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] text-ink/85">
                          {src.title}
                        </p>
                        <p className="text-[10px] text-faint">
                          {src.collection}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeNode.relatedNoteIds &&
              activeNode.relatedNoteIds.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                    Related notes
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {activeNode.relatedNoteIds.map((id) => (
                      <Badge key={id} tone="outline">
                        {id}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </aside>
      )}
    </div>
  );
}
