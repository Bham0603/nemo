/**
 * Context Assembly for RECALL Step 7.
 * Assigns citation IDs to retrieved chunks and builds a formatted context
 * block for injection into the Gemini system prompt.
 */

import type { RetrievedChunk } from "./types";

export interface AssembledContext {
  /** Chunks with citationId assigned (S1, S2, …) */
  chunks: RetrievedChunk[];
  /** Map from citationId → RetrievedChunk for validation */
  citationMap: Map<string, RetrievedChunk>;
  /** Formatted text block ready for system prompt injection */
  contextBlock: string;
}

const MAX_CONTEXT_CHARS = 100_000;

/**
 * Takes retrieved chunks, assigns S1/S2/… IDs, trims to budget,
 * and formats them for the Gemini system prompt.
 */
export function assembleContext(chunks: RetrievedChunk[]): AssembledContext {
  const citationMap = new Map<string, RetrievedChunk>();
  let used = 0;
  const selectedChunks: RetrievedChunk[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const citationId = `S${i + 1}`;
    const chunk = { ...chunks[i], citationId };

    const contribution = chunk.content.length + citationId.length + 80;
    if (used + contribution > MAX_CONTEXT_CHARS) break;

    chunk.citationId = citationId;
    selectedChunks.push(chunk);
    citationMap.set(citationId, chunk);
    used += contribution;
  }

  const contextBlock = formatContextBlock(selectedChunks);

  return { chunks: selectedChunks, citationMap, contextBlock };
}

function formatContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";

  const lines: string[] = [
    "=== KNOWLEDGE BASE CONTEXT ===",
    "The following passages are excerpts from the user's personal knowledge library.",
    "Use ONLY these passages to answer. Cite each passage you use with [S1], [S2], etc.",
    "",
  ];

  for (const chunk of chunks) {
    const loc = chunk.pageNumber ? ` (page ${chunk.pageNumber})` : "";
    lines.push(`[${chunk.citationId}] Source: "${chunk.sourceTitle}"${loc}`);
    lines.push(chunk.content.trim());
    lines.push("");
  }

  lines.push("=== END CONTEXT ===");
  return lines.join("\n");
}

