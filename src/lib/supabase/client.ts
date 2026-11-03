import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * Creates a singleton Supabase client for client-side React components.
 * Cookie handling is automatically managed in the browser.
 */
let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (typeof window !== "undefined" && clientInstance) {
    return clientInstance;
  }

  const client = createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey()
  );

  if (typeof window !== "undefined") {
    clientInstance = client;
  }

  return client;
}

