/**
 * Intelligent Text Chunking Service for RECALL.
 * Splits documents into coherent, overlapping chunks along natural boundaries
 * (headings, paragraphs, sentences) while preserving page numbers and order.
 */

export interface TextChunk {
  chunkIndex: number;
  content: string;
  wordCount: number;
  pageNumber?: number;
  metadata: Record<string, unknown>;
}

export interface ChunkOptions {
  /** Target words per chunk (default: 500) */
  targetWords?: number;
  /** Maximum words per chunk before forcing a split (default: 600) */
  maxWords?: number;
  /** Minimum words to consider a standalone chunk unless at EOF (default: 120) */
  minWords?: number;
  /** Number of words to overlap between sequential chunks (default: 80) */
  overlapWords?: number;
}

export interface PageContent {
  pageNumber: number;
  text: string;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  targetWords: 500,
  maxWords: 600,
  minWords: 120,
  overlapWords: 80,
};

/**
 * Counts words in a string.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Splits text into sentences cleanly.
 */
function splitIntoSentences(text: string): string[] {
  // Regex matches punctuation (.!?) followed by whitespace or end of string, avoiding abbreviations like e.g. or numbers like 3.14
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'\n])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 0 ? sentences : [text.trim()];
}

/**
 * Splits large paragraphs into sentence-level blocks.
 */
function breakDownBlock(block: string, maxWords: number): string[] {
  const words = countWords(block);
  if (words <= maxWords) return [block];

  const sentences = splitIntoSentences(block);
  const subBlocks: string[] = [];
  let current = "";

  for (const s of sentences) {
    const combined = current ? `${current} ${s}` : s;
    if (countWords(combined) > maxWords && current) {
      subBlocks.push(current);
      current = s;
    } else {
      current = combined;
    }
  }

  if (current) {
    // If a single sentence exceeds maxWords, split by word count
    if (countWords(current) > maxWords) {
      const wordsArr = current.split(/\s+/);
      for (let i = 0; i < wordsArr.length; i += maxWords) {
        subBlocks.push(wordsArr.slice(i, i + maxWords).join(" "));
      }
    } else {
      subBlocks.push(current);
    }
  }

  return subBlocks;
}

/**
 * Splits unified text into chunks respecting paragraphs, headings, and sentence boundaries.
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {},
  defaultPageNumber?: number,
  baseMetadata: Record<string, unknown> = {},
): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  // Split into structural blocks by double newline or markdown headers
  const rawBlocks = normalized
    .split(/\n{2,}|\n(?=#{1,4}\s)/)
    .map((b) => b.trim())
    .filter(Boolean);

  // Refine blocks: break down any that exceed maxWords
  const blocks: string[] = [];
  for (const rb of rawBlocks) {
    const sub = breakDownBlock(rb, opts.maxWords);
    blocks.push(...sub);
  }

  if (blocks.length === 0) return [];

  const chunks: TextChunk[] = [];
  let currentBlocks: string[] = [];
  let currentWordCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const bWords = countWords(b);

    if (currentWordCount + bWords > opts.maxWords && currentBlocks.length > 0) {
      // Finalize current chunk
      const content = currentBlocks.join("\n\n").trim();
      const chunkWords = countWords(content);

      if (chunkWords > 0) {
        chunks.push({
          chunkIndex: chunks.length,
          content,
          wordCount: chunkWords,
          pageNumber: defaultPageNumber,
          metadata: { ...baseMetadata },
        });
      }

      // Calculate overlap from end of current chunk
      const allWords = content.split(/\s+/);
      const overlapStart = Math.max(0, allWords.length - opts.overlapWords);
      const overlapText = allWords.slice(overlapStart).join(" ");

      // Start next chunk with overlap
      currentBlocks = [overlapText, b];
      currentWordCount = countWords(overlapText) + bWords;
    } else {
      currentBlocks.push(b);
      currentWordCount += bWords;
    }
  }

  // Push remaining content
  if (currentBlocks.length > 0) {
    const content = currentBlocks.join("\n\n").trim();
    const chunkWords = countWords(content);
    if (chunkWords > 0) {
      chunks.push({
        chunkIndex: chunks.length,
        content,
        wordCount: chunkWords,
        pageNumber: defaultPageNumber,
        metadata: { ...baseMetadata },
      });
    }
  }

  return chunks;
}

/**
 * Chunks multi-page documents (e.g. PDFs) preserving per-page tracking.
 */
export function chunkPages(
  pages: PageContent[],
  options: ChunkOptions = {},
  baseMetadata: Record<string, unknown> = {},
): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const filteredPages = pages.filter((p) => p.text && p.text.trim());
  if (filteredPages.length === 0) return [];

  const allChunks: TextChunk[] = [];
  let carryOverText = "";
  let carryOverPage = filteredPages[0].pageNumber;

  for (const page of filteredPages) {
    const pageText = carryOverText
      ? `${carryOverText}\n\n${page.text}`
      : page.text;
    const pageNumber = carryOverText ? carryOverPage : page.pageNumber;
    carryOverText = "";

    const words = countWords(pageText);

    // If page content is smaller than minWords and not the last page, carry it over to combine with next page
    if (words < opts.minWords && page !== filteredPages[filteredPages.length - 1]) {
      carryOverText = pageText;
      carryOverPage = pageNumber;
      continue;
    }

    const pageChunks = chunkText(pageText, opts, pageNumber, {
      ...baseMetadata,
      pageNumber,
    });

    for (const c of pageChunks) {
      allChunks.push({
        ...c,
        chunkIndex: allChunks.length,
      });
    }
  }

  return allChunks;
}

