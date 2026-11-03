/**
 * Google Gemini Embeddings & Vector Processing Service for RECALL.
 * Coordinates Gemini API calls via @google/genai, dimensionality validation (1536),
 * deterministic SHA-256 caching, batching, backfilling, and error recovery.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getGeminiClient } from "@/lib/gemini/client";
import {
  EMBEDDING_DIMENSIONS,
  getGeminiEmbeddingDimensions,
  getGeminiEmbeddingModel,
  isGeminiConfigured,
  MAX_EMBEDDING_BATCH_SIZE,
} from "./config";
import { computeContentHash } from "./hash";
import { formatDocumentChunkForEmbedding } from "./formatting";
import { hasUserConsent } from "./consent";

export interface EmbeddingItem {
  text: string;
  title?: string | null;
}

/**
 * Validates that an embedding vector conforms strictly to the 1536-dim requirement.
 */
export function validateEmbedding(vector: unknown): vector is number[] {
  if (!Array.isArray(vector)) return false;
  if (vector.length !== EMBEDDING_DIMENSIONS) return false;
  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    if (typeof val !== "number" || !Number.isFinite(val)) {
      return false;
    }
  }
  return true;
}

/**
 * Generates an embedding vector for a single text input using Gemini Embedding 2.
 */
export async function generateEmbedding(
  text: string,
  title?: string | null,
  model = getGeminiEmbeddingModel()
): Promise<number[]> {
  const vectors = await generateEmbeddings([{ text, title }], model);
  if (!vectors || vectors.length === 0 || !vectors[0]) {
    throw new Error("No embedding returned from Gemini provider.");
  }
  return vectors[0];
}

/**
 * Generates embeddings for an array of items with batching, validation,
 * rate-limit backoff, and timeouts.
 */
export async function generateEmbeddings(
  items: EmbeddingItem[],
  model = getGeminiEmbeddingModel()
): Promise<number[][]> {
  if (!items || items.length === 0) {
    return [];
  }

  const dimensions = getGeminiEmbeddingDimensions();
  const client = getGeminiClient();
  const allVectors: number[][] = [];

  // Format all items consistently
  const formattedItems = items.map((item) =>
    formatDocumentChunkForEmbedding(item.text, item.title)
  );

  for (let start = 0; start < formattedItems.length; start += MAX_EMBEDDING_BATCH_SIZE) {
    const batch = formattedItems.slice(start, start + MAX_EMBEDDING_BATCH_SIZE);

    let lastError: unknown = null;
    let batchSuccess = false;

    // Retry loop with exponential backoff for 429 rate limit or 5xx server errors
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout

      try {
        const response = await client.models.embedContent({
          model,
          contents: batch,
          config: {
            outputDimensionality: dimensions,
            abortSignal: controller.signal,
          },
        });

        clearTimeout(timeoutId);

        const rawList =
          response.embeddings ||
          ((response as unknown as { embedding?: { values?: number[] } }).embedding
            ? [(response as unknown as { embedding: { values?: number[] } }).embedding]
            : []);

        if (rawList.length !== batch.length) {
          throw new Error(
            `Expected ${batch.length} embeddings from Gemini, received ${rawList.length}.`
          );
        }

        for (let j = 0; j < rawList.length; j++) {
          const vec = rawList[j]?.values;
          if (!validateEmbedding(vec)) {
            const receivedLength = Array.isArray(vec) ? (vec as unknown[]).length : typeof vec;
            throw new Error(
              `Gemini vector at batch index ${j} failed validation: expected ${dimensions} finite numbers, got ${receivedLength}.`
            );
          }
          allVectors.push(vec);
        }

        batchSuccess = true;
        break;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isRateLimit =
          errMsg.includes("429") ||
          errMsg.toLowerCase().includes("quota") ||
          errMsg.toLowerCase().includes("resource_exhausted") ||
          errMsg.toLowerCase().includes("rate limit");
        const isServerErr =
          errMsg.includes("500") ||
          errMsg.includes("503") ||
          errMsg.toLowerCase().includes("unavailable");

        if (attempt < 2 && (isRateLimit || isServerErr)) {
          // Exponential backoff with jitter (1000ms, 2000ms...)
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break;
      }
    }

    if (!batchSuccess) {
      const msg = lastError instanceof Error ? lastError.message : "Failed to generate embeddings";
      throw new Error(`Google Gemini Embeddings API error: ${msg}`);
    }
  }

  return allVectors;
}

/**
 * Embeds a single knowledge chunk by ID, enforcing user consent, skipping regeneration
 * if content hash and model match, and safely updating chunk state.
 */
export async function embedKnowledgeChunk(
  supabase: SupabaseClient<Database>,
  userId: string,
  chunkId: string,
  model = getGeminiEmbeddingModel()
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  // 1. Verify explicit user consent
  const consent = await hasUserConsent(supabase, userId);
  if (!consent) {
    return {
      success: false,
      error: "User has not granted explicit consent for Google Gemini embedding processing.",
    };
  }

  try {
    const { data: chunk, error: fetchErr } = await supabase
      .from("knowledge_chunks")
      .select("id, content, embedding_status, embedding_model, content_hash, source_id, note_id")
      .eq("id", chunkId)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !chunk) {
      return { success: false, error: fetchErr?.message || "Chunk not found" };
    }

    // Resolve associated document title or note title
    let title = "Document";
    if (chunk.source_id) {
      const { data: src } = await supabase
        .from("sources")
        .select("title")
        .eq("id", chunk.source_id)
        .maybeSingle();
      if (src?.title) title = src.title;
    } else if (chunk.note_id) {
      const { data: note } = await supabase
        .from("notes")
        .select("title")
        .eq("id", chunk.note_id)
        .maybeSingle();
      if (note?.title) title = note.title;
    }

    const currentHash = computeContentHash(chunk.content, model, title);

    // If chunk is already ready with same content, title, and model, skip regeneration
    if (
      chunk.embedding_status === "ready" &&
      chunk.embedding_model === model &&
      chunk.content_hash === currentHash
    ) {
      return { success: true, skipped: true };
    }

    // Mark as processing
    await supabase
      .from("knowledge_chunks")
      .update({ embedding_status: "processing" })
      .eq("id", chunkId)
      .eq("user_id", userId);

    // Generate vector
    const vector = await generateEmbedding(chunk.content, title, model);
    const vectorString = JSON.stringify(vector);

    const { error: updateErr } = await supabase
      .from("knowledge_chunks")
      .update({
        embedding: vectorString,
        embedding_model: model,
        embedding_status: "ready",
        embedding_error: null,
        embedded_at: new Date().toISOString(),
        content_hash: currentHash,
      })
      .eq("id", chunkId)
      .eq("user_id", userId);

    if (updateErr) {
      throw updateErr;
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Gemini embedding generation failed";
    await supabase
      .from("knowledge_chunks")
      .update({
        embedding_status: "failed",
        embedding_error: errorMsg,
      })
      .eq("id", chunkId)
      .eq("user_id", userId);

    return { success: false, error: errorMsg };
  }
}

/**
 * Finds and embeds pending or failed chunks for the authenticated user
 * in bounded batches, respecting user consent.
 */
export async function embedPendingChunks(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 25,
  model = getGeminiEmbeddingModel()
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  hasMore: boolean;
  errors: string[];
}> {
  // 1. Verify user consent
  const consent = await hasUserConsent(supabase, userId);
  if (!consent) {
    throw new Error(
      "Explicit consent is required before processing document embeddings with Google Gemini."
    );
  }

  // Query pending or failed chunks for this user
  const { data: chunks, error: fetchErr } = await supabase
    .from("knowledge_chunks")
    .select("id, content, content_hash, source_id, note_id")
    .eq("user_id", userId)
    .in("embedding_status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit + 1);

  if (fetchErr) {
    throw new Error(`Failed to query pending chunks: ${fetchErr.message}`);
  }

  if (!chunks || chunks.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      hasMore: false,
      errors: [],
    };
  }

  const hasMore = chunks.length > limit;
  const targetChunks = chunks.slice(0, limit);

  // Pre-fetch source titles and note titles for proper chunk formatting
  const sourceIds = Array.from(new Set(targetChunks.map((c) => c.source_id).filter(Boolean))) as string[];
  const noteIds = Array.from(new Set(targetChunks.map((c) => c.note_id).filter(Boolean))) as string[];

  const titleMap = new Map<string, string>();

  if (sourceIds.length > 0) {
    const { data: srcRows } = await supabase
      .from("sources")
      .select("id, title")
      .in("id", sourceIds)
      .eq("user_id", userId);

    if (srcRows) {
      for (const r of srcRows) titleMap.set(`src:${r.id}`, r.title);
    }
  }

  if (noteIds.length > 0) {
    const { data: noteRows } = await supabase
      .from("notes")
      .select("id, title")
      .in("id", noteIds)
      .eq("user_id", userId);

    if (noteRows) {
      for (const r of noteRows) titleMap.set(`note:${r.id}`, r.title);
    }
  }

  const itemsToEmbed = targetChunks.map((c) => {
    const title = c.source_id
      ? titleMap.get(`src:${c.source_id}`)
      : c.note_id
      ? titleMap.get(`note:${c.note_id}`)
      : "Document";
    return { text: c.content, title };
  });

  // Mark all target chunks as processing
  const chunkIds = targetChunks.map((c) => c.id);
  await supabase
    .from("knowledge_chunks")
    .update({ embedding_status: "processing" })
    .in("id", chunkIds)
    .eq("user_id", userId);

  let vectors: number[][] = [];
  const errors: string[] = [];

  try {
    vectors = await generateEmbeddings(itemsToEmbed, model);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Batch embedding failed";
    errors.push(errMsg);

    await supabase
      .from("knowledge_chunks")
      .update({
        embedding_status: "failed",
        embedding_error: errMsg,
      })
      .in("id", chunkIds)
      .eq("user_id", userId);

    return {
      processed: targetChunks.length,
      succeeded: 0,
      failed: targetChunks.length,
      hasMore,
      errors,
    };
  }

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < targetChunks.length; i++) {
    const chunk = targetChunks[i];
    const vector = vectors[i];
    const title = itemsToEmbed[i].title;
    const contentHash = computeContentHash(chunk.content, model, title);

    if (vector && validateEmbedding(vector)) {
      const { error: saveErr } = await supabase
        .from("knowledge_chunks")
        .update({
          embedding: JSON.stringify(vector),
          embedding_model: model,
          embedding_status: "ready",
          embedding_error: null,
          embedded_at: new Date().toISOString(),
          content_hash: contentHash,
        })
        .eq("id", chunk.id)
        .eq("user_id", userId);

      if (saveErr) {
        failed++;
        errors.push(`Chunk ${chunk.id}: ${saveErr.message}`);
        await supabase
          .from("knowledge_chunks")
          .update({
            embedding_status: "failed",
            embedding_error: saveErr.message,
          })
          .eq("id", chunk.id)
          .eq("user_id", userId);
      } else {
        succeeded++;
      }
    } else {
      failed++;
      errors.push(`Chunk ${chunk.id}: returned invalid embedding`);
      await supabase
        .from("knowledge_chunks")
        .update({
          embedding_status: "failed",
          embedding_error: "Generated vector failed validation",
        })
        .eq("id", chunk.id)
        .eq("user_id", userId);
    }
  }

  return {
    processed: targetChunks.length,
    succeeded,
    failed,
    hasMore,
    errors,
  };
}

/**
 * Retries failed chunks for the authenticated user.
 */
export async function retryFailedEmbeddings(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 25,
  model = getGeminiEmbeddingModel()
) {
  return embedPendingChunks(supabase, userId, limit, model);
}

/**
 * Retrieves aggregate statistics on embedding progress and consent status for a user.
 */
export async function getEmbeddingStatus(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{
  totalChunks: number;
  readyChunks: number;
  pendingChunks: number;
  processingChunks: number;
  failedChunks: number;
  hasConsent: boolean;
  isConfigured: boolean;
  model: string;
  dimensions: number;
}> {
  const [chunksResult, consent] = await Promise.all([
    supabase
      .from("knowledge_chunks")
      .select("embedding_status")
      .eq("user_id", userId),
    hasUserConsent(supabase, userId),
  ]);

  const rows = chunksResult.data || [];
  let readyChunks = 0;
  let pendingChunks = 0;
  let processingChunks = 0;
  let failedChunks = 0;

  for (const r of rows) {
    if (r.embedding_status === "ready") readyChunks++;
    else if (r.embedding_status === "pending") pendingChunks++;
    else if (r.embedding_status === "processing") processingChunks++;
    else if (r.embedding_status === "failed") failedChunks++;
  }

  return {
    totalChunks: rows.length,
    readyChunks,
    pendingChunks,
    processingChunks,
    failedChunks,
    hasConsent: consent,
    isConfigured: isGeminiConfigured(),
    model: getGeminiEmbeddingModel(),
    dimensions: getGeminiEmbeddingDimensions(),
  };
}
