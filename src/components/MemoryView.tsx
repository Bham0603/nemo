"use client";

import {
  Brain,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import { memoryCategoryLabel, useRecall } from "@/lib/store";
import type { MemoryApproval, MemoryCategory, MemoryItem } from "@/lib/types";
import {
  Badge,
  Button,
  Dialog,
  Dropdown,
  EmptyState,
  PageHeader,
  Toggle,
} from "@/components/ui";

const CATEGORIES: MemoryCategory[] = [
  "preference",
  "interest",
  "project",
  "fact",
  "goal",
  "custom",
];

const approvalTone: Record<MemoryApproval, string> = {
  approved: "bg-white/[0.09] text-muted",
  pending: "border border-white/20 text-ink/80",
  rejected: "border border-white/10 text-faint line-through",
};

export function MemoryView() {
  const memory = useRecall((s) => s.memory);
  const addMemory = useRecall((s) => s.addMemory);
  const updateMemory = useRecall((s) => s.updateMemory);
  const deleteMemory = useRecall((s) => s.deleteMemory);
  const setApproval = useRecall((s) => s.setMemoryApproval);
  const toggleMemory = useRecall((s) => s.toggleMemory);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<"all" | MemoryCategory>("all");
  const [editing, setEditing] = useState<MemoryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    label: "",
    value: "",
    category: "preference" as MemoryCategory,
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return memory.filter((m) => {
      const matchesTerm =
        !term ||
        m.label.toLowerCase().includes(term) ||
        m.value.toLowerCase().includes(term);
      const matchesCategory = category === "all" || m.category === category;
      return matchesTerm && matchesCategory;
    });
  }, [memory, q, category]);

  const counts = useMemo(() => {
    const approved = memory.filter((m) => m.approval === "approved").length;
    const pending = memory.filter((m) => m.approval === "pending").length;
    return { approved, pending, total: memory.length };
  }, [memory]);

  const detail = memory.find((m) => m.id === detailId) ?? null;

  const openCreate = () => {
    setDraft({ label: "", value: "", category: "preference" });
    setCreating(true);
  };

  const openEdit = (m: MemoryItem) => {
    setDraft({ label: m.label, value: m.value, category: m.category });
    setEditing(m);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <PageHeader
          breadcrumbs={["Workspace", "AI memory"]}
          title="AI memory"
          description={`${counts.approved} of ${counts.total} memories approved${counts.pending ? ` · ${counts.pending} awaiting your review` : ""}. Demonstration data — no long-term memory is actually stored.`}
          actions={
            <Button variant="primary" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Add memory
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-2 px-7 pb-4">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition focus-within:border-white/25">
            <Search className="h-3.5 w-3.5 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search memories…"
              className="w-full bg-transparent text-[12.5px] placeholder:text-faint focus:outline-none"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Clear memory search"
                className="text-faint hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Dropdown
            label="Filter by category"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "All categories" },
              ...CATEGORIES.map((c) => ({
                value: c,
                label: memoryCategoryLabel[c],
              })),
            ]}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 scroll-thin">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Brain className="h-6 w-6" />}
              title="No memories match"
              description="Try a different term or category."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setQ("");
                    setCategory("all");
                  }}
                >
                  Reset
                </Button>
              }
            />
          ) : (
            <div className="grid gap-2.5 lg:grid-cols-2">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-xl border p-3.5 backdrop-blur-md transition",
                    m.approval === "rejected"
                      ? "border-white/[0.05] bg-black/20 opacity-60"
                      : "border-white/[0.07] bg-black/35 hover:border-white/20",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                        m.approval === "approved"
                          ? "bg-white/[0.1] text-white"
                          : "bg-white/[0.05] text-faint",
                      )}
                    >
                      <Brain className="h-3.5 w-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => setDetailId(m.id)}
                          className="truncate text-[12px] font-medium hover:underline"
                        >
                          {m.label}
                        </button>
                        <Badge tone="muted">
                          {memoryCategoryLabel[m.category]}
                        </Badge>
                        <span
                          className={cn(
                            "rounded px-1.5 py-px text-[9.5px] font-medium uppercase tracking-wide",
                            approvalTone[m.approval],
                          )}
                        >
                          {m.approval}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                        {m.value}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-faint">
                          {formatDate(m.createdAt)}
                          {m.sourceLabel ? ` · ${m.sourceLabel}` : ""}
                        </span>

                        <div className="ml-auto flex items-center gap-0.5">
                          {m.approval === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => setApproval(m.id, "approved")}
                            >
                              <Check className="h-3 w-3" /> Approve
                            </Button>
                          )}
                          <button
                            onClick={() => openEdit(m)}
                            aria-label={`Edit ${m.label}`}
                            className="rounded-md p-1.5 text-faint transition hover:bg-white/10 hover:text-ink"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(m.id)}
                            aria-label={`Delete ${m.label}`}
                            className="rounded-md p-1.5 text-faint transition hover:bg-white/10 hover:text-ink"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                          <Toggle
                            checked={m.enabled}
                            onChange={() => toggleMemory(m.id)}
                            label={`Toggle ${m.label}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-dashed border-white/12 bg-black/20 p-4 text-center">
            <p className="text-[12px] text-faint">
              Recall only stores what you approve. Nothing is inferred silently.
            </p>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {detail && (
        <aside className="flex w-[320px] shrink-0 flex-col border-l border-white/[0.06] bg-black/25 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-2 px-5 pb-3 pt-6">
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                Memory
              </p>
              <h2 className="mt-1 text-[14px] font-semibold leading-snug">
                {detail.label}
              </h2>
            </div>
            <button
              onClick={() => setDetailId(null)}
              aria-label="Close memory detail"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white/10 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 scroll-thin">
            <p className="text-[12px] leading-relaxed text-muted">
              {detail.value}
            </p>

            <dl className="mt-4 space-y-2">
              {[
                ["Category", memoryCategoryLabel[detail.category]],
                ["Approval", detail.approval],
                ["Active", detail.enabled ? "Yes" : "No"],
                ["Created", formatDate(detail.createdAt)],
                ["Source", detail.sourceLabel ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between">
                  <dt className="text-[11.5px] text-faint">{k}</dt>
                  <dd className="text-[11.5px] capitalize text-ink/85">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 space-y-1.5">
              {detail.approval !== "approved" && (
                <Button
                  className="w-full"
                  onClick={() => setApproval(detail.id, "approved")}
                >
                  <Check className="h-3.5 w-3.5" /> Approve memory
                </Button>
              )}
              {detail.approval !== "rejected" && (
                <Button
                  className="w-full"
                  onClick={() => setApproval(detail.id, "rejected")}
                >
                  Reject
                </Button>
              )}
              <Button
                className="w-full"
                variant="danger"
                onClick={() => {
                  setConfirmDelete(detail.id);
                  setDetailId(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete memory
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Create / edit dialog */}
      <Dialog
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit memory" : "Add a memory"}
        description="Memories are things you want Recall to remember about you. Nothing is saved to a server in this phase."
        footer={
          <>
            <Button
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!draft.label.trim() || !draft.value.trim()}
              onClick={() => {
                if (editing) {
                  updateMemory(editing.id, {
                    label: draft.label.trim(),
                    value: draft.value.trim(),
                    category: draft.category,
                  });
                } else {
                  addMemory({
                    id: `mem_${Date.now()}`,
                    label: draft.label.trim(),
                    value: draft.value.trim(),
                    category: draft.category,
                    approval: "approved",
                    enabled: true,
                    createdAt: new Date().toISOString().slice(0, 10),
                    sourceLabel: "Added manually",
                  });
                }
                setCreating(false);
                setEditing(null);
              }}
            >
              {editing ? "Save changes" : "Add memory"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-medium text-muted">Label</span>
            <input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder="e.g. Answer style"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12.5px] placeholder:text-faint focus:border-white/25 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-muted">Value</span>
            <textarea
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
              rows={3}
              placeholder="What should Recall remember?"
              className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12.5px] placeholder:text-faint focus:border-white/25 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-muted">Category</span>
            <div className="mt-1">
              <Dropdown
                label="Memory category"
                value={draft.category}
                onChange={(v) => setDraft({ ...draft, category: v })}
                options={CATEGORIES.map((c) => ({
                  value: c,
                  label: memoryCategoryLabel[c],
                }))}
              />
            </div>
          </label>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this memory?"
        description="Recall will stop using it. This cannot be undone in this session."
        footer={
          <>
            <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) deleteMemory(confirmDelete);
                setConfirmDelete(null);
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
