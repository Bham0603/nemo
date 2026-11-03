/**
 * Gemini Embedding User Privacy & Consent Management.
 * Protects personal documents by enforcing explicit user opt-in before
 * sending any text to Google Gemini APIs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Checks whether the authenticated user has explicitly opted in to
 * Google Gemini embeddings processing.
 */
export async function hasUserConsent(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("gemini_embedding_consent")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      return false;
    }

    return Boolean(profile.gemini_embedding_consent);
  } catch {
    return false;
  }
}

/**
 * Updates the user's explicit opt-in/opt-out consent for Gemini embeddings.
 */
export async function setUserConsent(
  supabase: SupabaseClient<Database>,
  userId: string,
  consent: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        gemini_embedding_consent: consent,
        gemini_consent_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update consent";
    return { success: false, error: msg };
  }
}

