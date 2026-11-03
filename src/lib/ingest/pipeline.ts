/**
 * Knowledge Ingestion Pipeline Orchestrator for RECALL.
 * Coordinates file validation, storage, text extraction, normalization,
 * intelligent chunking, and database persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  computeContentHash,
  generateEmbeddings,
  getGeminiEmbeddingModel,
  hasUserConsent,
  isGeminiConfigured,
} from "@/lib/embeddings";
import { chunkPages, chunkText } from "./chunker";
import { extractDocument } from "./extract";
import { ingestWebsiteUrl } from "./url";
import { validateUploadFile } from "./validation";

export const STORAGE_BUCKET = "knowledge-files";

export interface IngestFileParams {
  userId: string;
  buffer: Buffer;
  fileName: string;
  collectionName?: string;
  supabase: SupabaseClient<Database>;
}

export interface IngestUrlParams {
  userId: string;
  url: string;
  collectionName?: string;
  supabase: SupabaseClient<Database>;
}

export interface IngestNoteParams {
  userId: string;
  noteId?: string;
  title: string;
  content: string;
  noteDate?: string;
  tags?: string[];
  supabase: SupabaseClient<Database>;
}

/**
 * Finds or creates a user collection by name.
 */
async function resolveCollectionId(
  supabase: SupabaseClient<Database>,
  userId: string,
  collectionName?: string,
): Promise<string | null> {
  if (!collectionName || collectionName === "All") return null;

  try {
    const { data: existing } = await supabase
      .from("collections")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", collectionName)
      .maybeSingle();

    if (existing?.id) return existing.id;

    // Create collection for user
    const { data: created, error } = await supabase
      .from("collections")
      .insert({
        user_id: userId,
        name: collectionName,
      })
      .select("id")
      .single();

    if (error || !created) return null;
    return created.id;
  } catch {
    return null;
  }
}

/**
 * Ingests an uploaded document file:
 * Validate -> Create DB record -> Storage upload -> Extract -> Chunk -> Save chunks -> Mark Ready.
 */
export async function ingestDocumentFile({
  userId,
  buffer,
  fileName,
  collectionName = "Research",
  supabase,
}: IngestFileParams) {
  // 1. Validate file format and magic bytes
  const validation = validateUploadFile(buffer, fileName);
  if (!validation.valid) {
    throw new Error(validation.error || "File validation failed");
  }

  const sanitized = validation.sanitizedName;
  const collectionId = await resolveCollectionId(supabase, userId, collectionName);

  // 2. Check for duplicate sources with same title for user
  const { data: existingDup } = await supabase
    .from("sources")
    .select("id, processing_status")
    .eq("user_id", userId)
    .eq("file_name", sanitized)
    .maybeSingle();

  if (existingDup) {
    if (existingDup.processing_status === "ready") {
      throw new Error(`A document named '${sanitized}' already exists in your library.`);
    } else {
      // Clean up previous failed/partial upload attempt so user can re-upload cleanly
      await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("source_id", existingDup.id)
        .eq("user_id", userId);
      await supabase
        .from("sources")
        .delete()
        .eq("id", existingDup.id)
        .eq("user_id", userId);
    }
  }

  // 3. Create initial source record in DB
  const { data: source, error: sourceErr } = await supabase
    .from("sources")
    .insert({
      user_id: userId,
      collection_id: collectionId,
      title: sanitized,
      file_name: sanitized,
      file_type: validation.detectedType,
      file_size: buffer.length,
      processing_status: "processing",
    })
    .select("*")
    .single();

  if (sourceErr || !source) {
    throw new Error(`Failed to create database record: ${sourceErr?.message}`);
  }

  const safeStorageKey = sanitized.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${source.id}/${safeStorageKey}`;

  // 4. Upload raw file to private Supabase Storage
  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType:
        validation.detectedType === "pdf"
          ? "application/pdf"
          : validation.detectedType === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : validation.detectedType === "markdown"
              ? "text/markdown"
              : "text/plain",
      upsert: true,
    });

  if (uploadErr) {
    // Cleanup DB record if storage upload failed
    await supabase
      .from("sources")
      .delete()
      .eq("id", source.id)
      .eq("user_id", userId);
    throw new Error(`Failed to upload file to storage: ${uploadErr.message}`);
  }

  // Update storage_path on source record
  await supabase
    .from("sources")
    .update({ storage_path: storagePath })
    .eq("id", source.id)
    .eq("user_id", userId);

  // 5. Extract text from document
  try {
    const extraction = await extractDocument(buffer, sanitized);

    // Handle scanned or unreadable documents
    if (extraction.isScanned || extraction.wordCount < 10) {
      await supabase
        .from("sources")
        .update({
          processing_status: "failed",
          error_message:
            "Scanned document detected: PDF contains no extractable text layer (OCR not supported in this phase).",
          page_count: extraction.pageCount,
          word_count: extraction.wordCount,
          metadata: extraction.metadata as unknown as Json,
        })
        .eq("id", source.id)
        .eq("user_id", userId);

      return {
        source: {
          ...source,
          processing_status: "failed" as const,
          error_message: "Scanned document or empty text layer.",
        },
        chunksCount: 0,
      };
    }

    // 6. Generate intelligent chunks
    const chunks =
      extraction.pages && extraction.pages.length > 0
        ? chunkPages(extraction.pages, {}, { sourceId: source.id, title: sanitized })
        : chunkText(extraction.text, {}, 1, { sourceId: source.id, title: sanitized });

    // 7. Save chunks in batch
    let insertedChunks: Array<{ id: string; content: string }> = [];
    if (chunks.length > 0) {
      // Clear any partial chunks that might exist for this source
      await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("source_id", source.id)
        .eq("user_id", userId);

      const model = getGeminiEmbeddingModel();
      const chunkInserts = chunks.map((c) => ({
        user_id: userId,
        source_id: source.id,
        chunk_index: c.chunkIndex,
        content: c.content,
        page_number: c.pageNumber || 1,
        embedding_status: "pending" as const,
        content_hash: computeContentHash(c.content, model, sanitized),
        metadata: {
          ...c.metadata,
          wordCount: c.wordCount,
          sourceTitle: sanitized,
        },
      }));

      const { data: savedChunks, error: chunkErr } = await supabase
        .from("knowledge_chunks")
        .insert(chunkInserts)
        .select("id, content");

      if (chunkErr) {
        throw new Error(`Failed to save document chunks: ${chunkErr.message}`);
      }
      insertedChunks = savedChunks || [];
    }

    // 8. Update source to ready status with word and page stats
    const { data: updatedSource, error: updateErr } = await supabase
      .from("sources")
      .update({
        processing_status: "ready",
        page_count: extraction.pageCount,
        word_count: extraction.wordCount,
        error_message: null,
        metadata: extraction.metadata as unknown as Json,
      })
      .eq("id", source.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateErr || !updatedSource) {
      throw new Error(`Failed to finalize source record: ${updateErr?.message}`);
    }

    // 9. Automatic embedding generation (only if Gemini is configured AND user granted explicit consent)
    let embeddedCount = 0;
    const userConsent = await hasUserConsent(supabase, userId);
    if (isGeminiConfigured() && userConsent && insertedChunks.length > 0) {
      try {
        const model = getGeminiEmbeddingModel();
        const items = insertedChunks.map((c) => ({
          text: c.content,
          title: sanitized,
        }));
        const vectors = await generateEmbeddings(items, model);

        for (let i = 0; i < insertedChunks.length; i++) {
          const c = insertedChunks[i];
          const vec = vectors[i];
          await supabase
            .from("knowledge_chunks")
            .update({
              embedding: JSON.stringify(vec),
              embedding_model: model,
              embedding_status: "ready",
              embedded_at: new Date().toISOString(),
              embedding_error: null,
            })
            .eq("id", c.id)
            .eq("user_id", userId);
        }
        embeddedCount = insertedChunks.length;
      } catch (embErr: unknown) {
        const embMsg = embErr instanceof Error ? embErr.message : "Automatic Gemini embedding failed";
        console.warn("[Automatic Embedding Generation]", embMsg);
        await supabase
          .from("knowledge_chunks")
          .update({
            embedding_status: "failed",
            embedding_error: embMsg,
          })
          .eq("source_id", source.id)
          .eq("user_id", userId);
      }
    }

    return { source: updatedSource, chunksCount: chunks.length, embeddedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Processing failed";
    await supabase
      .from("sources")
      .update({
        processing_status: "failed",
        error_message: msg,
      })
      .eq("id", source.id)
      .eq("user_id", userId);

    // Clean up partial chunks if finalization failed, to prevent dirty state
    await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("source_id", source.id)
      .eq("user_id", userId);

    throw err;
  }
}

/**
 * Ingests a website URL:
 * Validate SSRF -> Fetch -> Cheerio extract -> Create Source -> Chunk -> Save chunks -> Mark Ready.
 */
export async function ingestWebsite({
  userId,
  url,
  collectionName = "Research",
  supabase,
}: IngestUrlParams) {
  const collectionId = await resolveCollectionId(supabase, userId, collectionName);

  // 1. Fetch webpage and extract text with anti-SSRF protections
  const webResult = await ingestWebsiteUrl(url);

  // 2. Create source record in DB
  const { data: source, error: sourceErr } = await supabase
    .from("sources")
    .insert({
      user_id: userId,
      collection_id: collectionId,
      title: webResult.title || url.replace(/^https?:\/\//, "").slice(0, 80),
      file_type: "link",
      external_url: webResult.finalUrl,
      processing_status: "processing",
      word_count: webResult.wordCount,
      page_count: 1,
      metadata: webResult.metadata as unknown as Json,
    })
    .select("*")
    .single();

  if (sourceErr || !source) {
    throw new Error(`Failed to create source record: ${sourceErr?.message}`);
  }

  try {
    // 3. Chunk website content
    const chunks = chunkText(webResult.text, {}, 1, {
      sourceId: source.id,
      url: webResult.finalUrl,
      title: webResult.title,
    });

    // 4. Save chunks in batch
    let insertedWebsiteChunks: Array<{ id: string; content: string }> = [];
    if (chunks.length > 0) {
      // Clear any previous chunks for this source (idempotence)
      await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("source_id", source.id)
        .eq("user_id", userId);

      const model = getGeminiEmbeddingModel();
      const chunkInserts = chunks.map((c) => ({
        user_id: userId,
        source_id: source.id,
        chunk_index: c.chunkIndex,
        content: c.content,
        page_number: 1,
        embedding_status: "pending" as const,
        content_hash: computeContentHash(c.content, model, webResult.title),
        metadata: {
          ...c.metadata,
          wordCount: c.wordCount,
          url: webResult.finalUrl,
          sourceTitle: webResult.title,
        },
      }));

      const { data: savedChunks, error: chunkErr } = await supabase
        .from("knowledge_chunks")
        .insert(chunkInserts)
        .select("id, content");

      if (chunkErr) {
        throw new Error(`Failed to save website chunks: ${chunkErr.message}`);
      }
      insertedWebsiteChunks = savedChunks || [];
    }

    // 5. Finalize status to ready
    const { data: updatedSource, error: updateErr } = await supabase
      .from("sources")
      .update({
        processing_status: "ready",
        error_message: null,
      })
      .eq("id", source.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateErr || !updatedSource) {
      throw new Error(`Failed to finalize website source: ${updateErr?.message}`);
    }

    // 6. Generate embeddings if Gemini is configured and consent granted
    const websiteConsent = await hasUserConsent(supabase, userId);
    if (isGeminiConfigured() && websiteConsent && insertedWebsiteChunks.length > 0) {
      try {
        const model = getGeminiEmbeddingModel();
        const items = insertedWebsiteChunks.map((c) => ({
          text: c.content,
          title: webResult.title,
        }));
        const vectors = await generateEmbeddings(items, model);

        for (let i = 0; i < insertedWebsiteChunks.length; i++) {
          const c = insertedWebsiteChunks[i];
          const vec = vectors[i];
          await supabase
            .from("knowledge_chunks")
            .update({
              embedding: JSON.stringify(vec),
              embedding_model: model,
              embedding_status: "ready",
              embedded_at: new Date().toISOString(),
              embedding_error: null,
            })
            .eq("id", c.id)
            .eq("user_id", userId);
        }
      } catch (embErr: unknown) {
        const embMsg = embErr instanceof Error ? embErr.message : "Automatic Gemini embedding failed";
        console.warn("[Automatic Embedding Generation]", embMsg);
        await supabase
          .from("knowledge_chunks")
          .update({
            embedding_status: "failed",
            embedding_error: embMsg,
          })
          .eq("source_id", source.id)
          .eq("user_id", userId);
      }
    }

    return { source: updatedSource, chunksCount: chunks.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Website processing failed";
    await supabase
      .from("sources")
      .update({
        processing_status: "failed",
        error_message: msg,
      })
      .eq("id", source.id)
      .eq("user_id", userId);

    await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("source_id", source.id)
      .eq("user_id", userId);

    throw err;
  }
}

/**
 * Ingests or updates a Daily Note and syncs its chunks:
 * Save Note -> Delete old chunks -> Chunk content -> Save new chunks.
 */
export async function ingestNote({
  userId,
  noteId,
  title,
  content,
  noteDate,
  tags = [],
  supabase,
}: IngestNoteParams) {
  let noteRow;

  if (noteId) {
    // Update existing note
    const { data, error } = await supabase
      .from("notes")
      .update({
        title,
        content,
        note_date: noteDate || new Date().toISOString().slice(0, 10),
        tags,
      })
      .eq("id", noteId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw new Error(`Failed to update note: ${error.message}`);
    noteRow = data;

    // Remove existing chunks for this note
    await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("note_id", noteId)
      .eq("user_id", userId);
  } else {
    // Create new note
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        title,
        content,
        note_date: noteDate || new Date().toISOString().slice(0, 10),
        tags,
      })
      .select("*")
      .single();

    if (error || !data) throw new Error(`Failed to create note: ${error?.message}`);
    noteRow = data;
  }

  // Generate chunks for note content if content is provided
  let chunksCount = 0;
  if (content.trim()) {
    const chunks = chunkText(content, {}, undefined, {
      noteId: noteRow.id,
      title: noteRow.title,
      tags: noteRow.tags,
    });

    if (chunks.length > 0) {
      // Ensure no partial or duplicate chunks exist
      await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("note_id", noteRow.id)
        .eq("user_id", userId);

      const model = getGeminiEmbeddingModel();
      const chunkInserts = chunks.map((c) => ({
        user_id: userId,
        note_id: noteRow.id,
        chunk_index: c.chunkIndex,
        content: c.content,
        page_number: null,
        embedding_status: "pending" as const,
        content_hash: computeContentHash(c.content, model, noteRow.title),
        metadata: {
          ...c.metadata,
          wordCount: c.wordCount,
          noteTitle: noteRow.title,
        },
      }));

      const { data: savedChunks } = await supabase
        .from("knowledge_chunks")
        .insert(chunkInserts)
        .select("id, content");

      chunksCount = chunks.length;

      // Generate embeddings for note chunks if Gemini is configured and consent granted
      const noteConsent = await hasUserConsent(supabase, userId);
      if (isGeminiConfigured() && noteConsent && savedChunks && savedChunks.length > 0) {
        try {
          const items = savedChunks.map((sc) => ({
            text: sc.content,
            title: noteRow.title,
          }));
          const vectors = await generateEmbeddings(items, model);

          for (let i = 0; i < savedChunks.length; i++) {
            const sc = savedChunks[i];
            const vec = vectors[i];
            await supabase
              .from("knowledge_chunks")
              .update({
                embedding: JSON.stringify(vec),
                embedding_model: model,
                embedding_status: "ready",
                embedded_at: new Date().toISOString(),
                embedding_error: null,
              })
              .eq("id", sc.id)
              .eq("user_id", userId);
          }
        } catch (embErr: unknown) {
          const embMsg = embErr instanceof Error ? embErr.message : "Note embedding failed";
          console.warn("[Automatic Note Embedding Generation]", embMsg);
          await supabase
            .from("knowledge_chunks")
            .update({
              embedding_status: "failed",
              embedding_error: embMsg,
            })
            .eq("note_id", noteRow.id)
            .eq("user_id", userId);
        }
      }
    }
  }

  return { note: noteRow, chunksCount };
}

/**
 * Retries ingestion for a failed source.
 */
export async function retrySourceIngestion(
  supabase: SupabaseClient<Database>,
  userId: string,
  sourceId: string,
) {
  const { data: source, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .eq("user_id", userId)
    .single();

  if (error || !source) {
    throw new Error("Source not found or unauthorized.");
  }

  // Mark status as processing
  await supabase
    .from("sources")
    .update({ processing_status: "processing", error_message: null })
    .eq("id", sourceId)
    .eq("user_id", userId);

  // Clear any existing partial chunks
  await supabase
    .from("knowledge_chunks")
    .delete()
    .eq("source_id", sourceId)
    .eq("user_id", userId);

  if (source.file_type === "link" && source.external_url) {
    // Re-ingest website
    const webResult = await ingestWebsiteUrl(source.external_url);
    const chunks = chunkText(webResult.text, {}, 1, {
      sourceId: source.id,
      url: webResult.finalUrl,
      title: webResult.title,
    });

    if (chunks.length > 0) {
      const chunkInserts = chunks.map((c) => ({
        user_id: userId,
        source_id: source.id,
        chunk_index: c.chunkIndex,
        content: c.content,
        page_number: 1,
        metadata: { ...c.metadata, wordCount: c.wordCount },
      }));
      await supabase.from("knowledge_chunks").insert(chunkInserts);
    }

    const { data: updatedSource, error: updateErr } = await supabase
      .from("sources")
      .update({
        processing_status: "ready",
        word_count: webResult.wordCount,
        error_message: null,
      })
      .eq("id", sourceId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateErr) {
      throw new Error(`Failed to finalize retried source: ${updateErr.message}`);
    }

    return { success: true, source: updatedSource, chunksCount: chunks.length };
  }

  if (source.storage_path) {
    // Download file from storage
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(source.storage_path);

    if (downloadErr || !fileData) {
      throw new Error(`Failed to download stored file: ${downloadErr?.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const extraction = await extractDocument(buffer, source.file_name || source.title);

    if (extraction.isScanned || extraction.wordCount < 10) {
      await supabase
        .from("sources")
        .update({
          processing_status: "failed",
          error_message: "Scanned document: no text layer found.",
        })
        .eq("id", sourceId)
        .eq("user_id", userId);
      return { success: false, reason: "scanned" };
    }

    const chunks =
      extraction.pages && extraction.pages.length > 0
        ? chunkPages(extraction.pages, {}, { sourceId: source.id })
        : chunkText(extraction.text, {}, 1, { sourceId: source.id });

    const model = getGeminiEmbeddingModel();
    let insertedChunks: Array<{ id: string; content: string }> = [];
    if (chunks.length > 0) {
      const chunkInserts = chunks.map((c) => ({
        user_id: userId,
        source_id: source.id,
        chunk_index: c.chunkIndex,
        content: c.content,
        page_number: c.pageNumber || 1,
        embedding_status: "pending" as const,
        content_hash: computeContentHash(c.content, model, source.title),
        metadata: { ...c.metadata, wordCount: c.wordCount, sourceTitle: source.title },
      }));
      const { data: savedChunks } = await supabase
        .from("knowledge_chunks")
        .insert(chunkInserts)
        .select("id, content");
      insertedChunks = savedChunks || [];
    }

    const { data: updatedSource, error: updateErr } = await supabase
      .from("sources")
      .update({
        processing_status: "ready",
        word_count: extraction.wordCount,
        page_count: extraction.pageCount,
        error_message: null,
        metadata: extraction.metadata as unknown as Json,
      })
      .eq("id", sourceId)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (updateErr) {
      throw new Error(`Failed to finalize retried source: ${updateErr.message}`);
    }

    // Attempt embeddings for retried source if Gemini is configured and consent granted
    const retryConsent = await hasUserConsent(supabase, userId);
    if (isGeminiConfigured() && retryConsent && insertedChunks.length > 0) {
      try {
        const items = insertedChunks.map((c) => ({ text: c.content, title: source.title }));
        const vectors = await generateEmbeddings(items, model);
        for (let i = 0; i < insertedChunks.length; i++) {
          const c = insertedChunks[i];
          const vec = vectors[i];
          await supabase
            .from("knowledge_chunks")
            .update({
              embedding: JSON.stringify(vec),
              embedding_model: model,
              embedding_status: "ready",
              embedded_at: new Date().toISOString(),
              embedding_error: null,
            })
            .eq("id", c.id)
            .eq("user_id", userId);
        }
      } catch (embErr: unknown) {
        const embMsg = embErr instanceof Error ? embErr.message : "Retry Gemini embedding failed";
        console.warn("[Retry Embedding Generation]", embMsg);
      }
    }

    return { success: true, source: updatedSource, chunksCount: chunks.length };
  }

  throw new Error("Source does not have an external URL or storage file.");
}
