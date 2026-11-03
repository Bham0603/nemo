/**
 * Reusable Google GenAI Server-Side Client for RECALL.
 * Initialized strictly with GEMINI_API_KEY on the server.
 */

import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./config";

let cachedClient: GoogleGenAI | null = null;
let lastApiKey: string | null = null;

/**
 * Returns a cached singleton GoogleGenAI client.
 * Recreates client if the API key in environment changes.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!cachedClient || lastApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    lastApiKey = apiKey;
  }
  return cachedClient;
}

/**
 * Resets the cached client (primarily used in automated test suites).
 */
export function resetGeminiClient(): void {
  cachedClient = null;
  lastApiKey = null;
}

