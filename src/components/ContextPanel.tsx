"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Code2,
  Globe,
  Headphones,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import type { ContextGroup } from "@/lib/types";

const groupIcon: Record<ContextGroup["kind"], typeof BookOpen> = {
  youtube: Youtube,
  book: BookOpen,
  website: Globe,
  codebase: Code2,
  podcast: Headphones,
  research: Sparkles,
};

export function ContextPanel() {
  const groups = useRecall((s) => s.groups);
  const toggleGroup = useRecall((s) => s.toggleGroup);
  const addGroupItem = useRecall((s) => s.addGroupItem);
  const removeGroupItem = useRecall((s) => s.removeGroupItem);
  const chat = useRecall((s) => s.chats.find((c) => c.id === s.activeChatId));
  const setChatMode = useRecall((s) => s.setChatMode);
  const toggleSelectedSource = useRecall((s) => s.toggleSelectedSource);
  const newChat = useRecall((s) => s.newChat);
  const contextOpen = useRecall((s) => s.contextPanelOpen);
  const setContextOpen = useRecall((s) => s.setContextPanelOpen);
  const chats = useRecall((s) => s.chats);
  const setActiveChat = useRecall((s) => s.setActiveChat);
  const setChats = useRecall((s) => s.setChats);
  const deleteChat = useRecall((s) => s.deleteChat);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((d) => {
        if (d.conversations && d.conversations.length > 0) {
          const dbChats = d.conversations.map((c: { id: string; title: string; conversation_mode: "regular" | "context"; updated_at: string }) => ({
            id: c.id,
            dbConversationId: c.id,
            title: c.title,
            subtitle: `${c.conversation_mode === "context" ? "Context" : "Regular"} chat`,
            mode: c.conversation_mode,
            selectedSourceIds: [],
            messages: [],
            updatedAt: c.updated_at,
          }));
          setChats(dbChats);
        }
      })
      .catch(() => {});
  }, [setChats]);

  const [query, setQuery] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!chat) return null;

  const filtered = groups.map((g) => ({
    ...g,
    items: g.items.filter((i) =>
      i.label.toLowerCase().includes(query.toLowerCase()),
    ),
  }));

  return (
    <>
      {contextOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setContextOpen(false)}
          aria-hidden="true"
        />
      )}
      <section
        className={cn(
          "flex flex-col border-r border-white/[0.06] bg-[#090a12]/98 backdrop-blur-xl transition-transform duration-200 lg:bg-black/14",
          "fixed inset-y-0 left-0 z-40 w-[290px] sm:w-[300px] lg:relative lg:inset-auto lg:z-auto lg:w-[300px] lg:shrink-0 lg:translate-x-0",
          contextOpen
            ? "translate-x-0 shadow-2xl shadow-black/90"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-start justify-between px-5 pb-3 pt-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
              {chat.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-faint">
              {chat.subtitle}
            </p>
          </div>
          <button
            onClick={() => setContextOpen(false)}
            aria-label="Close context sources panel"
            className="ml-2 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white/10 hover:text-ink lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

      {/* Conversations switcher */}
      {chats.length > 1 && (
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              Conversations ({chats.length})
            </span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto scroll-thin rounded-xl border border-line bg-panel/40 p-1">
            {chats.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-2 py-1.5 text-[12px] transition",
                  c.id === chat.id
                    ? "bg-white/10 text-white font-medium"
                    : "text-muted hover:bg-white/[0.04] hover:text-ink"
                )}
              >
                <button
                  onClick={() => setActiveChat(c.id)}
                  className="flex-1 text-left truncate mr-1"
                >
                  {c.title}
                </button>
                {c.dbConversationId && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm("Delete this conversation?")) {
                        await fetch(`/api/conversations/${c.dbConversationId}`, { method: "DELETE" }).catch(() => {});
                        deleteChat(c.id);
                      }
                    }}
                    title="Delete conversation"
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-faint hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode switch */}
      <div className="px-5 pb-3">
        <div className="flex rounded-xl border border-line bg-panel/70 p-1">
          {(["regular", "context"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setChatMode(chat.id, m)}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-[12.5px] font-medium capitalize transition",
                chat.mode === m
                  ? "bg-panel-3 text-ink shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]"
                  : "text-faint hover:text-muted",
              )}
            >
              {m} chat
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-panel/60 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your context..."
            className="w-full bg-transparent text-[12.5px] text-ink placeholder:text-faint focus:outline-none"
          />
        </div>
      </div>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto px-3 scroll-thin">
        {filtered.map((g) => {
          const Icon = groupIcon[g.kind];
          return (
            <div key={g.id} className="mb-0.5">
              <div
                className={cn(
                  "group flex items-center gap-1.5 rounded-lg px-2 py-2 transition hover:bg-panel-2/70",
                  g.expanded && "bg-panel-2/40",
                )}
              >
                <button
                  onClick={() => toggleGroup(g.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  {g.expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-faint" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-faint" />
                  )}
                  <Icon className="h-[15px] w-[15px] shrink-0 text-muted" strokeWidth={1.8} />
                  <span className="truncate text-[12.5px] text-ink/85">
                    {g.label}
                  </span>
                </button>
                <button className="rounded p-1 text-faint opacity-0 transition hover:text-ink group-hover:opacity-100">
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </div>

              {g.expanded && (
                <div className="ml-[26px] mt-0.5 space-y-0.5 border-l border-line-soft pl-2">
                  {g.items.map((item) => {
                    const selected = chat.selectedSourceIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition",
                          selected
                            ? "bg-white/10 text-ink"
                            : "text-muted hover:bg-panel-2/60 hover:text-ink",
                        )}
                      >
                        <button
                          onClick={() => toggleSelectedSource(chat.id, item.id)}
                          className="flex flex-1 items-center gap-2 text-left"
                        >
                          <span
                            className={cn(
                              "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[4px] border transition",
                              selected
                                ? "border-white/30 bg-white text-black"
                                : "border-line-soft",
                            )}
                          >
                            {selected && (
                              <svg viewBox="0 0 10 10" className="h-2 w-2">
                                <path
                                  d="M1 5.2 3.6 7.8 9 2.4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </span>
                          <span className="truncate text-[12px]">{item.label}</span>
                        </button>
                        <button
                          onClick={() => removeGroupItem(g.id, item.id)}
                          className="rounded p-0.5 text-faint opacity-0 transition hover:text-white group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}

                  {addingTo === g.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!draft.trim()) return;
                        addGroupItem(g.id, draft.trim());
                        setDraft("");
                        setAddingTo(null);
                      }}
                      className="px-1 py-1"
                    >
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => {
                          setAddingTo(null);
                          setDraft("");
                        }}
                        placeholder="Name this source"
                        className="w-full rounded-md border border-white/25 bg-panel px-2 py-1 text-[12px] focus:outline-none"
                      />
                    </form>
                  ) : (
                    <button
                      onClick={() => setAddingTo(g.id)}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-faint transition hover:text-white"
                    >
                      <Plus className="h-3 w-3" /> Add new
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New context chat */}
      <div className="border-t border-line-soft p-3.5">
        <button
          onClick={newChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-panel/60 py-2.5 text-[12.5px] font-medium text-ink/90 transition hover:border-white/25 hover:bg-panel-2"
        >
          <Plus className="h-3.5 w-3.5" /> Add new context chat
        </button>
      </div>
    </section>
  </>
  );
}
