/**
 * Google Gemini Configuration for RECALL.
 * Server-side credentials, embedding parameters, and future chat models.
 */

export const GEMINI_DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2";
export const GEMINI_DEFAULT_EMBEDDING_DIMENSIONS = 1536;
export const GEMINI_DEFAULT_CHAT_MODEL = "gemini-3.8-flash";
export const GEMINI_MAX_BATCH_SIZE = 50;

/**
 * Returns the configured Gemini API key from server-side environment variables.
 * Throws a descriptive error if not set.
 */
export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY to your .env.local file to enable embeddings and semantic search."
    );
  }
  return key.trim();
}

/**
 * Checks whether the Gemini API key is present in environment variables.
 */
export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Returns the embedding model identifier.
 */
export function getGeminiEmbeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL?.trim() || GEMINI_DEFAULT_EMBEDDING_MODEL;
}

/**
 * Returns the output dimensionality for embeddings.
 */
export function getGeminiEmbeddingDimensions(): number {
  const dim = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS);
  return Number.isFinite(dim) && dim > 0 ? dim : GEMINI_DEFAULT_EMBEDDING_DIMENSIONS;
}

/**
 * Returns the default chat model for Step 7.
 */
export function getGeminiChatModel(): string {
  return process.env.GEMINI_CHAT_MODEL?.trim() || GEMINI_DEFAULT_CHAT_MODEL;
}

