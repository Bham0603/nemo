/**
 * Google Gemini Embeddings Configuration for RECALL.
 * Server-side parameters, dimensionality, and batch sizes.
 */

import {
  getGeminiApiKey,
  getGeminiEmbeddingDimensions,
  getGeminiEmbeddingModel,
  isGeminiConfigured,
} from "@/lib/gemini/config";

export const EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2";
export const MAX_EMBEDDING_BATCH_SIZE = 50; // Maximum texts per Gemini API request

export {
  getGeminiApiKey,
  getGeminiEmbeddingDimensions,
  getGeminiEmbeddingModel,
  isGeminiConfigured,
};
