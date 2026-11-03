"use client";

import {
  Brain,
  CornerDownLeft,
  FileText,
  Library,
  Link2,
  Mail,
  MessageSquare,
  NotebookPen,
  Search,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import type { ViewId } from "@/lib/types";

const views: { id: ViewId; label: string; icon: typeof Search }[] = [
  { id: "chats", label: "Go to chats", icon: MessageSquare },
  { id: "library", label: "Go to library", icon: Library },
  { id: "search", label: "Semantic search", icon: Search },
  { id: "connections", label: "Knowledge connections", icon: Link2 },
  { id: "notes", label: "Daily notes", icon: NotebookPen },
  { id: "memory", label: "AI memory", icon: Brain },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "email", label: "Email integration", icon: Mail },
  { id: "research", label: "Smart research", icon: Sparkles },
  { id: "meeting", label: "Meeting prep", icon: Users },
];

export function CommandPalette() {
  const open = useRecall((s) => s.commandOpen);
  const setOpen = useRecall((s) => s.setCommandOpen);
  const setView = useRecall((s) => s.setView);
  const setActiveChat = useRecall((s) => s.setActiveChat);
  const sources = useRecall((s) => s.sources);
  const chats = useRecall((s) => s.chats);

  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setIdx(0);
  }, [setOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, close]);

  // Focus the input after open. Query reset happens in close(), so no state is
  // written during the effect body.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const items = useMemo(() => {
    const nav = views.map((v) => ({
      key: v.id,
      label: v.label,
      hint: "Navigate",
      icon: v.icon,
      run: () => setView(v.id),
    }));
    const chatItems = chats.map((c) => ({
      key: c.id,
      label: c.title,
      hint: "Chat",
      icon: MessageSquare,
      run: () => setActiveChat(c.id),
    }));
    const srcItems = sources.map((s) => ({
      key: s.id,
      label: s.title,
      hint: s.collection,
      icon: FileText,
      run: () => setView("library"),
    }));
    const all = [...nav, ...chatItems, ...srcItems];
    if (!q.trim()) return all.slice(0, 9);
    const needle = q.toLowerCase();
    return all
      .filter((i) => i.label.toLowerCase().includes(needle))
      .slice(0, 9);
  }, [q, chats, sources, setView, setActiveChat]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-sm"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-rise w-full max-w-[560px] overflow-hidden rounded-2xl border border-line bg-panel-2 shadow-2xl shadow-black/70"
      >
        <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(items.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter" && items[idx]) {
                items[idx].run();
                close();
              }
            }}
            placeholder="Search sources, chats, or jump to a view..."
            className="w-full bg-transparent text-[13.5px] placeholder:text-faint focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-line bg-panel-3 px-1.5 py-0.5 text-[10px] text-faint">
            ESC
          </kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-1.5 scroll-thin">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onMouseEnter={() => setIdx(i)}
                onClick={() => {
                  item.run();
                  close();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                  i === idx ? "bg-white/10 text-ink" : "text-muted",
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    i === idx ? "text-white" : "text-faint",
                  )}
                />
                <span className="flex-1 truncate text-[12.5px]">
                  {item.label}
                </span>
                <span className="shrink-0 text-[10.5px] text-faint">
                  {item.hint}
                </span>
                {i === idx && (
                  <CornerDownLeft className="h-3 w-3 shrink-0 text-faint" />
                )}
              </button>
            );
          })}
          {items.length === 0 && (
            <p className="px-3 py-6 text-center text-[12px] text-faint">
              Nothing matches.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
