/**
 * Citation Parsing and Validation for RECALL Step 7.
 * Parses [S1], [S2] markers from generated text,
 * validates them against the retrieved chunk map,
 * and returns validated Citation objects.
 */

import type { Citation, RetrievedChunk } from "./types";

const CITATION_REGEX = /\[S(\d+)\]/g;

/**
 * Scans generated text for [S1], [S2], … markers,
 * validates each against the citation map, and returns
 * a deduplicated list of valid citations.
 * Unknown markers (e.g. [S99]) are silently dropped.
 */
export function parseAndValidateCitations(
  text: string,
  citationMap: Map<string, RetrievedChunk>
): Citation[] {
  const seen = new Set<string>();
  const citations: Citation[] = [];

  let match: RegExpExecArray | null;
  CITATION_REGEX.lastIndex = 0;

  while ((match = CITATION_REGEX.exec(text)) !== null) {
    const citationId = `S${match[1]}`;
    if (seen.has(citationId)) continue;

    const chunk = citationMap.get(citationId);
    if (!chunk) continue; // unknown marker — drop it

    seen.add(citationId);
    citations.push({
      citationId,
      sourceId: chunk.sourceId,
      chunkId: chunk.chunkId,
      documentTitle: chunk.sourceTitle,
      pageNumber: chunk.pageNumber,
      excerpt: chunk.content.slice(0, 400),
      similarityScore: chunk.similarity,
    });
  }

  return citations;
}

