/**
 * Conversation History Loader for RECALL Step 7.
 * Loads recent messages from Supabase and maps them to Gemini SDK Content[].
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Content } from "@google/genai";

const HISTORY_LIMIT = 12;

/**
 * Loads the last N messages from a conversation and converts them to
 * the Gemini SDK Content[] format.
 * - DB role "assistant" → SDK role "model"
 * - DB role "system" is excluded (not passed to SDK)
 * - DB role "user" → SDK role "user"
 */
export async function loadConversationHistory(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  userId: string
): Promise<Content[]> {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !messages) return [];

  // Reverse to chronological order
  const chronological = [...messages].reverse();

  const contents: Content[] = [];
  for (const msg of chronological) {
    if (msg.role === "system") continue; // skip system messages

    const sdkRole = msg.role === "assistant" ? "model" : "user";
    contents.push({
      role: sdkRole,
      parts: [{ text: msg.content }],
    });
  }

  return contents;
}

