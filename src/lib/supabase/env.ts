/**
 * RECALL Supabase Environment Helper
 * Safely parses and validates Supabase environment variables.
 * Fallbacks are provided during static production builds when real credentials
 * have not yet been placed in .env.local.
 */

const FALLBACK_URL = "https://placeholder-project.supabase.co";
const FALLBACK_KEY = "placeholder-publishable-key-for-build";

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes("your-project-id")) {
    if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
      console.warn(
        "[RECALL] NEXT_PUBLIC_SUPABASE_URL is not configured. Please set it in .env.local"
      );
    }
    return FALLBACK_URL;
  }
  return url;
}

export function getSupabasePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!key || key.includes("your-supabase-publishable")) {
    if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
      console.warn(
        "[RECALL] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured. Please set it in .env.local"
      );
    }
    return FALLBACK_KEY;
  }
  return key;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(
    url &&
      !url.includes("your-project-id") &&
      !url.includes("placeholder-project") &&
      key &&
      !key.includes("your-supabase-publishable") &&
      !key.includes("placeholder-publishable-key")
  );
}

