import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeminiClient } from "@/lib/gemini/client";
import { getGeminiChatModel, isGeminiConfigured } from "@/lib/gemini/config";
import { hasChatConsent } from "@/lib/chat/consent";
import { retrieveRelevantChunks } from "@/lib/chat/retrieval";
import { assembleContext } from "@/lib/chat/context";
import { parseAndValidateCitations } from "@/lib/chat/citations";
import { buildContextChatPrompt, buildRegularChatPrompt } from "@/lib/chat/prompt";
import { loadConversationHistory } from "@/lib/chat/history";
import { createSSEResponse, encodeEvent } from "@/lib/chat/streaming";
import type { ChatRequest, Citation } from "@/lib/chat/types";
import type { Content } from "@google/genai";

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 4000;
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_MESSAGES = 30;

export async function POST(req: NextRequest) {
  // --- Authentication ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Gemini configured? ---
  if (!isGeminiConfigured()) {
    return new Response(
      JSON.stringify({
        error:
          "GEMINI_API_KEY is not configured. Please add it to .env.local to enable AI chat.",
        code: "GEMINI_KEY_MISSING",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Parse request body ---
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    conversationId,
    message,
    mode,
    selectedSourceIds = [],
    selectedCollectionIds = [],
  } = body;

  // --- Validate input ---
  if (typeof message !== "string" || !message.trim()) {
    return new Response(JSON.stringify({ error: "Message must be a non-empty string." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (mode !== "regular" && mode !== "context") {
    return new Response(
      JSON.stringify({ error: "Mode must be 'regular' or 'context'." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Chat consent check ---
  const hasConsent = await hasChatConsent(supabase, user.id);
  if (!hasConsent) {
    return new Response(
      JSON.stringify({
        error:
          "Chat consent is required. Please enable AI chat in Settings → AI Settings.",
        code: "CHAT_CONSENT_REQUIRED",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Rate limit check ---
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000
  ).toISOString();
  const { count: recentCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", windowStart);

  if ((recentCount ?? 0) >= RATE_LIMIT_MAX_MESSAGES) {
    return new Response(
      JSON.stringify({
        error: `Rate limit reached. Max ${RATE_LIMIT_MAX_MESSAGES} messages per ${RATE_LIMIT_WINDOW_MINUTES} minutes.`,
        code: "RATE_LIMIT_EXCEEDED",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Verify source ownership (if sources provided) ---
  if (selectedSourceIds.length > 0) {
    const { data: ownedSources } = await supabase
      .from("sources")
      .select("id")
      .eq("user_id", user.id)
      .in("id", selectedSourceIds);

    const ownedIds = new Set((ownedSources || []).map((s) => s.id));
    const unauthorized = selectedSourceIds.filter((id) => !ownedIds.has(id));
    if (unauthorized.length > 0) {
      return new Response(
        JSON.stringify({ error: "One or more selected sources do not belong to you." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // --- Resolve / create conversation ---
  let activeConversationId = conversationId;

  if (!activeConversationId) {
    // Create a new conversation
    const title = message.trim().slice(0, 60) + (message.trim().length > 60 ? "…" : "");
    const { data: newConv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
        conversation_mode: mode,
      })
      .select("id")
      .single();

    if (convErr || !newConv) {
      return new Response(
        JSON.stringify({ error: "Failed to create conversation." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    activeConversationId = newConv.id;
  } else {
    // Verify ownership
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", activeConversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conv) {
      return new Response(
        JSON.stringify({ error: "Conversation not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const finalConversationId = activeConversationId;

  // --- Persist user message ---
  const { data: userMsg, error: userMsgErr } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      conversation_id: finalConversationId,
      role: "user",
      content: message.trim(),
      citations: [],
    })
    .select("id")
    .single();

  if (userMsgErr || !userMsg) {
    return new Response(
      JSON.stringify({ error: "Failed to persist user message." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pre-create assistant message placeholder (will be updated after generation)
  const { data: assistantMsg, error: assistantMsgErr } = await supabase
    .from("messages")
    .insert({
      user_id: user.id,
      conversation_id: finalConversationId,
      role: "assistant",
      content: "",
      citations: [],
    })
    .select("id")
    .single();

  if (assistantMsgErr || !assistantMsg) {
    return new Response(
      JSON.stringify({ error: "Failed to create assistant message." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const assistantMessageId = assistantMsg.id;

  // --- Stream the response ---
  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort());

  return createSSEResponse(async (controller) => {
    // Emit start event
    controller.enqueue(
      encodeEvent({
        type: "start",
        data: { conversationId: finalConversationId, messageId: assistantMessageId },
      })
    );

    try {
      // --- Load conversation history ---
      const history = await loadConversationHistory(
        supabase,
        finalConversationId,
        user.id
      );
      // Remove the last user message from history (it's the current turn)
      const historyWithoutCurrent = history.slice(0, -1);

      // --- RAG retrieval (context mode only) ---
      let systemPrompt: string;
      let citationMap = new Map<string, import("@/lib/chat/types").RetrievedChunk>();

      if (mode === "context") {
        const chunks = await retrieveRelevantChunks(supabase, message.trim(), {
          matchCount: 8,
          matchThreshold: 0.35,
          filterSourceIds: selectedSourceIds,
          filterCollectionIds: selectedCollectionIds,
        });

        const assembled = assembleContext(chunks);
        citationMap = assembled.citationMap;
        systemPrompt = buildContextChatPrompt(assembled);
      } else {
        systemPrompt = buildRegularChatPrompt();
      }

      // --- Build Gemini contents array ---
      const contents: Content[] = [
        ...historyWithoutCurrent,
        { role: "user", parts: [{ text: message.trim() }] },
      ];

      // --- Call Gemini streaming API ---
      const ai = getGeminiClient();
      const model = getGeminiChatModel();

      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 2048,
          abortSignal: abortController.signal,
        },
      });

      // --- Stream tokens to client ---
      let fullText = "";

      for await (const chunk of stream) {
        if (abortController.signal.aborted) break;

        const text = chunk.text;
        if (text) {
          fullText += text;
          controller.enqueue(encodeEvent({ type: "token", data: { text } }));
        }
      }

      // --- Parse and validate citations ---
      const citations: Citation[] =
        mode === "context"
          ? parseAndValidateCitations(fullText, citationMap)
          : [];

      // --- Emit citation event ---
      controller.enqueue(encodeEvent({ type: "citation", data: citations }));

      // --- Persist assistant message ---
      await supabase
        .from("messages")
        .update({
          content: fullText,
          citations: citations as unknown as import("@/lib/supabase/database.types").Json,
          generation_status: "complete",
          model: model,
        })
        .eq("id", assistantMessageId)
        .eq("user_id", user.id);

      // --- Update conversation updated_at ---
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", finalConversationId)
        .eq("user_id", user.id);

      // --- Emit done event ---
      controller.enqueue(
        encodeEvent({
          type: "done",
          data: { conversationId: finalConversationId, messageId: assistantMessageId },
        })
      );
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        // Client disconnected — mark message as incomplete
        await supabase
          .from("messages")
          .update({ generation_status: "aborted" })
          .eq("id", assistantMessageId)
          .eq("user_id", user.id);
        return;
      }

      const msg = err instanceof Error ? err.message : "Generation failed";
      console.error("[Chat API Error]", msg, err);

      // Mark message as failed
      await supabase
        .from("messages")
        .update({ generation_status: "failed" })
        .eq("id", assistantMessageId)
        .eq("user_id", user.id);

      controller.enqueue(
        encodeEvent({ type: "error", data: { message: "AI generation failed. Please try again." } })
      );
    }
  });
}

