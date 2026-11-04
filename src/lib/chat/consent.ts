/**
 * Chat Consent Management for RECALL Step 7.
 * Separate from embedding consent: gemini_chat_consent controls
 * whether the user allows their messages to be sent to the Gemini chat API.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Returns true if the authenticated user has explicitly opted in to
 * Gemini-powered conversational AI.
 */
export async function hasChatConsent(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("gemini_chat_consent")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) return false;
    return Boolean(profile.gemini_chat_consent);
  } catch {
    return false;
  }
}

/**
 * Sets the user's explicit opt-in/out for Gemini conversational AI.
 */
export async function setChatConsent(
  supabase: SupabaseClient<Database>,
  userId: string,
  consent: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        gemini_chat_consent: consent,
        gemini_chat_consent_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update chat consent";
    return { success: false, error: msg };
  }
}

