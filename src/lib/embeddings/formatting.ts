/**
 * Prompt Formatting Helpers for Gemini Embedding 2.
 * Enforces uniform semantic structures across document passages and retrieval queries.
 */

/**
 * Formats a document chunk for embedding.
 * Applied across PDF, DOCX, TXT, Markdown, Web, and Daily Notes.
 * Format: "title: {document_title} | text: {chunk_content}"
 */
export function formatDocumentChunkForEmbedding(
  content: string,
  title?: string | null
): string {
  const normalizedTitle = (title || "Untitled Knowledge Document").replace(/[\r\n|]+/g, " ").trim();
  const normalizedText = content.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  return `title: ${normalizedTitle} | text: ${normalizedText}`;
}

/**
 * Formats a search query for retrieval embedding.
 * Format: "task: search result | query: {user_query}"
 */
export function formatSearchQueryForEmbedding(query: string): string {
  const normalizedQuery = query.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  return `task: search result | query: ${normalizedQuery}`;
}

