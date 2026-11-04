"use client";

import {
  Copy,
  FileText,
  Layers,
  Link2,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn, formatTime, parseBold, sourceById } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import type { Citation, Message } from "@/lib/types";

function CitationChips({ citations }: { citations: Citation[] }) {
  const sources = useRecall((s) => s.sources);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {citations.map((c, i) => {
        const src = typeof c.sourceId === "string" ? sourceById(sources, c.sourceId) : null;
        if (!src) return null;
        const key = `${c.sourceId}-${i}`;
        const isOpen = open === key;
        return (
          <div key={key} className="relative">
            <button
              onClick={() => setOpen(isOpen ? null : key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition",
                isOpen
                  ? "border-white/25 bg-white/10 text-white"
                  : "border-white/10 bg-white/[0.04] text-muted hover:border-white/20 hover:text-ink",
              )}
            >
              <FileText className="h-3 w-3" />
              <span className="max-w-[190px] truncate">{src.title}</span>
              {c.page && (
                <span className="rounded bg-white/10 px-1 py-px text-[10px] text-faint">
                  p.{c.page}
                </span>
              )}
            </button>
            {isOpen && (
              <div className="animate-rise absolute bottom-full left-0 z-30 mb-2 w-[320px] rounded-xl border border-white/12 bg-[#0b0c14]/95 p-3 shadow-2xl shadow-black/70 backdrop-blur-xl">
                <p className="mb-1.5 text-[11px] font-medium text-white">
                  {src.title}
                  {c.page ? ` · page ${c.page}` : ""}
                </p>
                <p className="text-[11.5px] leading-relaxed text-muted">
                  &ldquo;{c.snippet}&rdquo;
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Bubble({ m }: { m: Message }) {
  const profile = useRecall((s) => s.profile);
  const isUser = m.role === "user";

  if (isUser) {
    return (
      <div className="animate-rise flex gap-3">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/25 to-white/10 text-[10px] font-semibold text-ink">
          {profile.initials}
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-[12.5px] font-medium">{profile.displayName}</span>
            <span className="text-[11px] text-faint">
              {formatTime(m.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink/90">
            {m.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise flex gap-3">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-white/30 to-white/10">
        <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[12.5px] font-medium">Recall</span>
          <span className="text-[11px] text-faint">
            {formatTime(m.createdAt)}
          </span>
        </div>

        <div
          className={cn(
            "group mt-1.5 rounded-xl border border-white/[0.07] bg-black/45 px-3.5 py-3 backdrop-blur-md transition hover:border-white/12",
          )}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              {m.content.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="text-[13.5px] leading-[1.65] text-ink/88"
                >
                  {parseBold(para).map((seg) =>
                    seg.bold ? (
                      <strong key={seg.key} className="font-semibold text-ink">
                        {seg.text}
                      </strong>
                    ) : (
                      <span key={seg.key}>{seg.text}</span>
                    ),
                  )}
                </p>
              ))}
              {m.streaming && (
                <span className="inline-block h-3.5 w-[2px] animate-pulse-soft bg-white align-middle" />
              )}
            </div>

            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
              {[RefreshCw, Pencil, Copy, Share2].map((Icon, i) => (
                <button
                  key={i}
                  className="rounded-md p-1.5 text-faint transition hover:bg-white/10 hover:text-ink"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          {m.citations && m.citations.length > 0 && (
            <CitationChips citations={m.citations} />
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatThread() {
  const chat = useRecall((s) => s.chats.find((c) => c.id === s.activeChatId));
  const sources = useRecall((s) => s.sources);
  const toggleContextPanel = useRecall((s) => s.toggleContextPanel);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.messages.length]);

  if (!chat) return null;

  const selected = chat.selectedSourceIds
    .map((id) => sourceById(sources, id))
    .filter(Boolean);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 px-7 pb-4 pt-6">
        <div className="min-w-0">
          <h1 className="text-[19px] font-semibold tracking-[-0.015em]">
            Create new custom context
          </h1>
          {selected.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-faint">
              <Link2 className="h-3 w-3" />
              Grounded in {selected.length} source
              {selected.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={toggleContextPanel}
            aria-label="Toggle context sources"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[12px] font-medium text-muted transition hover:border-white/20 hover:text-ink lg:hidden"
          >
            <Layers className="h-3.5 w-3.5" /> Sources
          </button>
          <button className="shrink-0 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-ink/90 transition hover:border-white/25 hover:bg-white/10">
            Save this custom text
          </button>
        </div>
      </header>

      {/* Selected source cards */}
      {selected.length > 0 && (
        <div className="space-y-2 px-7 pb-2">
          {selected.map((src) => (
            <div
              key={src!.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/40 px-3.5 py-2.5 backdrop-blur-md"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-white/20 to-white/5 text-[9px] font-bold tracking-wide text-ink">
                {src!.kind === "pdf" ? "PDF" : src!.kind.toUpperCase().slice(0, 4)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{src!.title}</p>
                <p className="text-[11px] text-faint">
                  {src!.sizeLabel} — 100% uploaded
                </p>
              </div>
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/20 bg-white/15">
                <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white">
                  <path
                    d="M1 5.2 3.6 7.8 9 2.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-7 py-4 scroll-thin">
        {chat.messages.length === 0 ? (
          <EmptyState />
        ) : (
          chat.messages.map((m) => <Bubble key={m.id} m={m} />)
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function EmptyState() {
  const prompts = [
    "How does self-attention work in Transformers?",
    "Connect Transformer Architecture and RAG for me",
    "Summarise everything in Research",
    "What did I learn about vector databases?",
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-7 grid h-14 w-14 place-items-center">
        <span className="absolute inset-0 animate-halo rounded-full bg-white/20 blur-2xl" />
        <span className="absolute inset-0 rounded-full border border-white/10" />
        <span className="absolute -inset-3 rounded-full border border-white/[0.05]" />
        <Sparkles className="relative h-6 w-6 text-white" strokeWidth={1.8} />
      </div>

      <h3 className="animate-fade text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[42px]">
        A new era
      </h3>
      <p className="animate-fade mt-3 max-w-[440px] text-[13px] leading-relaxed text-muted">
        Introducing your second brain. Ask anything, and every answer arrives
        with the exact passage it came from.
      </p>

      <div className="mt-8 grid w-full max-w-[520px] gap-1.5 sm:grid-cols-2">
        {prompts.map((p) => (
          <button
            key={p}
            className="glass-soft glass-hover rounded-xl px-3.5 py-2.5 text-left text-[12.5px] leading-snug text-muted hover:text-ink"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
