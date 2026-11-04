"use client";

import { ArrowUp, Paperclip, Plus, Square, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRecall } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { StreamEvent, Citation } from "@/lib/chat/types";

export function Composer() {
  const chat = useRecall((s) => s.chats.find((c) => c.id === s.activeChatId));
  const appendMessage = useRecall((s) => s.appendMessage);
  const updateMessage = useRecall((s) => s.updateMessage);

  const [value, setValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  if (!chat) return null;

  const stop = () => {
    abortRef.current?.abort();
    setGenerating(false);
  };

  const send = async () => {
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
    setGenerating(true);

    // Placeholder for streaming assistant reply
    const replyId = `a_${Date.now()}`;
    appendMessage(chat.id, {
      id: replyId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      streaming: true,
      citations: [],
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: chat.dbConversationId ?? null,
          message: text,
          mode: chat.mode,
          selectedSourceIds: chat.selectedSourceIds,
          selectedCollectionIds: [],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        const errorMsg =
          err.code === "CHAT_CONSENT_REQUIRED"
            ? "AI chat is not enabled. Please go to Settings → AI preferences and enable Gemini AI Chat."
            : err.error || "Failed to send message.";
        updateMessage(chat.id, replyId, {
          content: errorMsg,
          streaming: false,
        });
        setGenerating(false);
        return;
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      let dbConversationId: string | null = null;

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;

        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;

          let event: StreamEvent;
          try {
            event = JSON.parse(json);
          } catch {
            continue;
          }

          if (event.type === "start") {
            dbConversationId = event.data.conversationId;
            // Store the real conversation ID on the chat
            useRecall.setState((st) => ({
              chats: st.chats.map((c) =>
                c.id === chat.id
                  ? { ...c, dbConversationId: event.data.conversationId }
                  : c
              ),
            }));
          } else if (event.type === "token") {
            accumulatedText += event.data.text;
            updateMessage(chat.id, replyId, {
              content: accumulatedText,
              streaming: true,
            });
          } else if (event.type === "citation") {
            const citations = event.data as Citation[];
            updateMessage(chat.id, replyId, { citations });
          } else if (event.type === "done") {
            updateMessage(chat.id, replyId, { streaming: false });
          } else if (event.type === "error") {
            updateMessage(chat.id, replyId, {
              content: event.data.message || "An error occurred.",
              streaming: false,
            });
          }
        }
      }

      // Final update
      updateMessage(chat.id, replyId, { streaming: false });
      void dbConversationId; // consumed via setState above
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        updateMessage(chat.id, replyId, { streaming: false });
        return;
      }
      const msg = err instanceof Error ? err.message : "Connection error.";
      updateMessage(chat.id, replyId, {
        content: msg,
        streaming: false,
      });
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
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
                void send();
              }
            }}
            placeholder="Ask me to do anything…"
            disabled={generating}
            className="max-h-[160px] flex-1 resize-none bg-transparent px-1 py-2.5 text-[13.5px] leading-relaxed text-ink placeholder:text-faint/90 focus:outline-none scroll-thin disabled:opacity-60"
          />

          <button className="mb-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint transition hover:bg-white/[0.07] hover:text-ink">
            <Wand2 className="h-4 w-4" strokeWidth={1.9} />
          </button>

          <div className="mb-0.5 mr-0.5 hidden shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-muted sm:flex">
            {chat.mode === "context" ? "Context" : "Regular"}
            <span className="text-faint">Chat</span>
          </div>

          {generating ? (
            <button
              onClick={stop}
              className="mb-0.5 flex shrink-0 items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-[12px] font-medium text-black transition hover:bg-white"
            >
              <Square className="h-3 w-3 fill-current" /> Stop
            </button>
          ) : (
            <button
              onClick={() => void send()}
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
