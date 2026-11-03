"use client";

import { ArrowUp, Paperclip, Plus, Square, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRecall } from "@/lib/store";
import { cn } from "@/lib/utils";

const CANNED: Record<string, string> = {
  default:
    "Here is what your knowledge library says.\n\n**The short answer.** Your sources converge on grounded intelligence: generative models require external non-parametric retrieval to provide reliable factual accuracy.\n\n**Key principles.** Transformer Architecture establishes parallel self-attention mechanisms over token sequences, while RAG research and Vector Database Research demonstrate that hybrid retrieval (dense embeddings + BM25) eliminates hallucinations.\n\n**What to do next.** Ensure chunk boundaries align with semantic section headers rather than arbitrary fixed token counts, and enforce passage-level citations for every generated claim.",
  transformer:
    "**Transformer Architecture, from your own sources.**\n\n**Transformer Architecture.pdf** establishes the foundational paradigm: self-attention eliminates recurrence and convolutions entirely, allowing tokens to directly route information to and from each other via scaled dot-product attention.\n\n**Deep Learning Notes.pdf** provides the operational mechanics: Multi-head attention projects queries, keys, and values into parallel subspaces, while residual connections and LayerNorm prevent vanishing gradients across deep layer stacks.\n\n**Key takeaway.** Attention is not simply an alignment layer; it is the core routing mechanism of modern language representation.",
  connect:
    "**Connecting Transformer Architecture and RAG.**\n\n**Transformer Architecture.pdf** describes how deep encoders produce dense contextual representations. **RAG Research.pdf** and **Vector Database Research.md** take those high-dimensional embeddings and index them with HNSW graphs for approximate nearest-neighbor search.\n\nRead together, they form a unified knowledge system: the Transformer provides the semantic understanding, while the vector database and RAG pipeline provide the persistent, verifiable external memory.",
  summarise:
    "**Research Collection — Core Knowledge Themes.**\n\n**Theme 1: Self-attention and representation learning.** Transformer Architecture.pdf and Deep Learning Notes.pdf establish how attention replaces sequential recurrence with O(1) path length between distant tokens.\n\n**Theme 2: Grounded retrieval and verification.** RAG Research.pdf and Vector Database Research.md prove that pairing dense vector similarity with lexical BM25 produces robust recall without parametric hallucination.\n\n**Theme 3: Autonomous orchestration.** AI Agents Documentation.pdf shows how LLM reasoning cores integrate memory and tool use to execute multi-step workflows.",
  week:
    "**Knowledge notes summary:**\n\n1. **Chunking is a product decision** (daily note, Nov 1). Chunk size chooses what unit of meaning the user is allowed to be answered with.\n2. **Citations must be passage-level** (daily note, Oct 31). A citation that does not support the sentence above it transfers trust without transferring evidence.\n3. **Dense vs sparse retrieval trade-offs** (Oct 29). Hybrid fusion with BM25 preserves exact identifier recall.\n4. **pgvector operating notes** (Oct 25). Exact scan is simpler and sufficient under 500k chunks before requiring HNSW graph indexing.",
};

function pickReply(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("transformer") || p.includes("attention")) return CANNED.transformer;
  if (p.includes("connect") || p.includes("two") || p.includes("rag")) return CANNED.connect;
  if (p.includes("summar")) return CANNED.summarise;
  if (p.includes("week") || p.includes("learn") || p.includes("note")) return CANNED.week;
  return CANNED.default;
}

export function Composer() {
  const chat = useRecall((s) => s.chats.find((c) => c.id === s.activeChatId));
  const appendMessage = useRecall((s) => s.appendMessage);
  const updateMessage = useRecall((s) => s.updateMessage);
  const sources = useRecall((s) => s.sources);

  const [value, setValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  if (!chat) return null;

  const send = () => {
    const text = value.trim();
    if (!text || generating) return;

    const now = new Date().toISOString();
    appendMessage(chat.id, {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: now,
    });
    setValue("");

    const replyId = `a_${Date.now()}`;
    setGenerating(true);

    const t1 = setTimeout(() => {
      const grounded = chat.selectedSourceIds
        .map((id) => sources.find((s) => s.id === id))
        .filter(Boolean)
        .slice(0, 2);

      appendMessage(chat.id, {
        id: replyId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        streaming: true,
        citations: grounded.map((s) => ({
          sourceId: s!.id,
          page: s!.pages ? Math.min(12, s!.pages) : undefined,
          snippet: s!.excerpt,
        })),
      });

      const full = pickReply(text);
      let i = 0;
      const step = Math.max(4, Math.ceil(full.length / 90));
      const tick = () => {
        i = Math.min(full.length, i + step);
        updateMessage(chat.id, replyId, {
          content: full.slice(0, i),
          streaming: i < full.length,
        });
        if (i < full.length) {
          timers.current.push(setTimeout(tick, 16));
        } else {
          setGenerating(false);
        }
      };
      tick();
    }, 420);

    timers.current.push(t1);
  };

  return (
    <div className="relative shrink-0 px-6 pb-5 pt-2">
      <div className="rim rim-glow glass relative rounded-[26px] p-[7px]">
        <div className="flex items-end gap-1.5">
          <button className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.04] text-muted transition hover:border-white/15 hover:bg-white/[0.09] hover:text-ink">
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
          <button className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint transition hover:bg-white/[0.07] hover:text-ink">
            <Paperclip className="h-4 w-4" strokeWidth={1.9} />
          </button>

          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask me to do anything…"
            className="max-h-[160px] flex-1 resize-none bg-transparent px-1 py-2.5 text-[13.5px] leading-relaxed text-ink placeholder:text-faint/90 focus:outline-none scroll-thin"
          />

          <button className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint transition hover:bg-white/[0.07] hover:text-ink">
            <Wand2 className="h-4 w-4" strokeWidth={1.9} />
          </button>

          <div className="mb-0.5 mr-0.5 hidden shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-muted sm:flex">
            Auto
            <span className="text-faint">Medium</span>
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-faint">
              <path
                d="M2 4l3 3 3-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {generating ? (
            <button
              onClick={() => setGenerating(false)}
              className="mb-0.5 flex shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-[12px] font-medium text-black transition hover:bg-white"
            >
              <Square className="h-3 w-3 fill-current" /> Stop
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!value.trim()}
              className={cn(
                "mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full transition duration-300",
                value.trim()
                  ? "bg-white text-black shadow-[0_0_28px_-4px_rgba(255,255,255,0.5)] hover:bg-white/90 hover:text-black"
                  : "border border-white/[0.07] bg-transparent text-faint/60",
              )}
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2.5 text-center text-[10.5px] tracking-wide text-faint/80">
        Recall answers only from your selected sources and cites the passage.
      </p>
    </div>
  );
}
