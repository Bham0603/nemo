/**
 * Chat Service Type Definitions for RECALL Step 7.
 * Shared types for the RAG conversational pipeline.
 */

/** A persisted chat message (mirrors DB messages table). */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  createdAt: string;
  streaming?: boolean;
}

/** A single retrieved knowledge chunk used as RAG context. */
export interface RetrievedChunk {
  /** Short display ID assigned during this request, e.g. "S1" */
  citationId: string;
  chunkId: string;
  sourceId: string | null;
  noteId: string | null;
  sourceTitle: string;
  sourceType: string;
  pageNumber: number | null;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** Incoming request body for POST /api/chat */
export interface ChatRequest {
  conversationId: string | null;
  message: string;
  mode: "regular" | "context";
  selectedSourceIds: string[];
  selectedCollectionIds: string[];
}

/** Server-sent event shapes emitted by the chat streaming endpoint. */
export type StreamEvent =
  | { type: "start"; data: { conversationId: string; messageId: string } }
  | { type: "token"; data: { text: string } }
  | { type: "citation"; data: Citation[] }
  | { type: "done"; data: { conversationId: string; messageId: string } }
  | { type: "error"; data: { message: string } };

/** A validated source citation attached to an assistant message. */
export interface Citation {
  citationId: string;      // "S1", "S2", …
  sourceId: string | null;
  chunkId: string;
  documentTitle: string;
  pageNumber: number | null;
  excerpt: string;
  similarityScore: number;
}

