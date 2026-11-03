"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn, formatDate, formatLongDate } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import type { Note } from "@/lib/types";
import { Button, Dialog, EmptyState } from "@/components/ui";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function shiftDay(iso: string, delta: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return isoDay(d);
}

export function NotesView() {
  const { user } = useAuth();
  const notes = useRecall((s) => s.notes);
  const setNotes = useRecall((s) => s.setNotes);
  const addNote = useRecall((s) => s.addNote);
  const updateNote = useRecall((s) => s.updateNote);
  const deleteNote = useRecall((s) => s.deleteNote);

  const today = isoDay(new Date());
  const [activeId, setActiveId] = useState(notes[0]?.id ?? "");
  const [tagDraft, setTagDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const active = notes.find((n) => n.id === activeId) ?? notes[0] ?? null;

  // Load user notes from Supabase
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!user) return;
      try {
        const res = await fetch("/api/notes");
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data.notes) && data.notes.length > 0) {
            setNotes(data.notes);
            setActiveId((curr) => curr || data.notes[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load notes", err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user, setNotes]);

  // Debounced server sync
  const saveNoteToServer = useCallback(
    async (noteToSave: Note) => {
      if (!user) return;
      try {
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: noteToSave.id.startsWith("note_") ? undefined : noteToSave.id,
            title: noteToSave.title,
            content: noteToSave.body,
            noteDate: noteToSave.date,
            tags: noteToSave.tags,
          }),
        });
      } catch (err) {
        console.error("Failed to sync note to server", err);
      }
    },
    [user],
  );

  const handleUpdate = (patch: Partial<Note>) => {
    if (!active) return;
    const updated = { ...active, ...patch };
    updateNote(active.id, patch);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNoteToServer(updated);
    }, 1200);
  };

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.date.localeCompare(a.date)),
    [notes],
  );

  const createFor = async (date: string) => {
    const existing = notes.find((n) => n.date === date);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const defaultTitle = `Note for ${formatDate(date)}`;
    if (user) {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: defaultTitle,
            content: "",
            noteDate: date,
            tags: [],
          }),
        });
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          if (res.ok && data?.note) {
            addNote(data.note);
            setActiveId(data.note.id);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to create note on server", err);
      }
    }

    const id = `note_${Date.now()}`;
    addNote({
      id,
      date,
      title: defaultTitle,
      body: "",
      tags: [],
    });
    setActiveId(id);
  };

  const handleDelete = async (id: string) => {
    if (user && !id.startsWith("note_")) {
      try {
        await fetch(`/api/notes/${id}`, { method: "DELETE" });
      } catch (err) {
        console.error("Failed to delete note from server", err);
      }
    }
    deleteNote(id);
    const next = sorted.find((n) => n.id !== id);
    setActiveId(next?.id ?? "");
    setConfirmDelete(null);
  };

  const related = useMemo(() => {
    if (!active) return [];
    return sorted.filter(
      (n) => n.id !== active.id && n.tags.some((t) => active.tags.includes(t)),
    );
  }, [active, sorted]);

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#/, "").toLowerCase();
    if (!t || !active) return;
    if (active.tags.includes(t)) {
      setTagDraft("");
      return;
    }
    handleUpdate({ tags: [...active.tags, t] });
    setTagDraft("");
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* Note list */}
      <div className="flex w-[290px] shrink-0 flex-col border-r border-white/[0.06] bg-black/20 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 pb-3 pt-6">
          <div>
            <h1 className="text-[15px] font-semibold">Daily notes</h1>
            <p className="text-[11.5px] text-faint">
              {notes.length} entr{notes.length === 1 ? "y" : "ies"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => createFor(today)}
            title="New note for today"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scroll-thin">
          {sorted.length === 0 ? (
            <EmptyState
              icon={<NotebookPen className="h-5 w-5" />}
              title="No notes yet"
              description="Start with today."
            />
          ) : (
            sorted.map((n) => (
              <button
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={cn(
                  "mb-0.5 w-full rounded-lg px-2.5 py-2 text-left transition",
                  active?.id === n.id
                    ? "bg-white/[0.09]"
                    : "hover:bg-white/[0.05]",
                )}
              >
                <p className="truncate text-[12.5px] font-medium">{n.title}</p>
                <p className="mt-0.5 text-[11px] text-faint">
                  {formatDate(n.date)}
                  {n.tags.length > 0 && ` · ${n.tags.length} tags`}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <header className="flex items-start justify-between gap-4 px-7 pb-2 pt-6">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const target = shiftDay(active.date, -1);
                      const existing = notes.find((n) => n.date === target);
                      if (existing) setActiveId(existing.id);
                      else createFor(target);
                    }}
                    aria-label="Previous day"
                    className="grid h-6 w-6 place-items-center rounded-md text-faint transition hover:bg-white/10 hover:text-ink"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
                    {formatLongDate(active.date)}
                  </p>
                  <button
                    onClick={() => {
                      const target = shiftDay(active.date, 1);
                      const existing = notes.find((n) => n.date === target);
                      if (existing) setActiveId(existing.id);
                      else createFor(target);
                    }}
                    aria-label="Next day"
                    className="grid h-6 w-6 place-items-center rounded-md text-faint transition hover:bg-white/10 hover:text-ink"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => createFor(today)}
                    className="ml-1"
                  >
                    <CalendarDays className="h-3 w-3" /> Today
                  </Button>
                </div>

                <input
                  value={active.title}
                  onChange={(e) =>
                    handleUpdate({ title: e.target.value })
                  }
                  className="mt-1 w-full bg-transparent text-[19px] font-semibold tracking-[-0.015em] focus:outline-none"
                />
              </div>

              <Button
                size="sm"
                variant="danger"
                onClick={() => setConfirmDelete(active.id)}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 scroll-thin">
              <textarea
                value={active.body}
                onChange={(e) => {
                  handleUpdate({ body: e.target.value });
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                placeholder="Write it down before you lose it…"
                className="min-h-[240px] w-full resize-none bg-transparent text-[13.5px] leading-[1.75] text-ink/88 placeholder:text-faint focus:outline-none"
              />

              {/* Tags */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {active.tags.map((t) => (
                  <span
                    key={t}
                    className="group inline-flex items-center gap-1 rounded-md bg-white/[0.09] px-2 py-0.5 text-[10.5px] text-white"
                  >
                    #{t}
                    <button
                      onClick={() =>
                        handleUpdate({
                          tags: active.tags.filter((x) => x !== t),
                        })
                      }
                      aria-label={`Remove tag ${t}`}
                      className="text-faint opacity-0 transition group-hover:opacity-100 hover:text-ink"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addTag();
                  }}
                  className="inline-flex items-center gap-1"
                >
                  <Tag className="h-3 w-3 text-faint" />
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    placeholder="add tag"
                    className="w-20 bg-transparent text-[11px] placeholder:text-faint focus:outline-none"
                  />
                </form>
              </div>

              {/* Related notes */}
              {related.length > 0 && (
                <div className="mt-6 border-t border-white/[0.06] pt-4">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                    Related notes
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {related.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setActiveId(r.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.05]"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
                        <span className="min-w-0 flex-1 truncate text-[12px] text-ink/85">
                          {r.title}
                        </span>
                        <span className="shrink-0 text-[10.5px] text-faint">
                          {formatDate(r.date)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center">
            <EmptyState
              icon={<NotebookPen className="h-6 w-6" />}
              title="No note selected"
              description="Create one for today to get started."
              action={
                <Button size="sm" onClick={() => createFor(today)}>
                  <Plus className="h-3 w-3" /> New note
                </Button>
              }
            />
          </div>
        )}
      </div>

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this note?"
        description="The note and its generated knowledge chunks will be permanently removed from your second brain."
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
