/**
 * Server-side document text extraction engine for RECALL.
 * Supports PDF, DOCX, TXT, and Markdown files with metadata extraction,
 * page-number preservation, and scanned document detection.
 */

import mammoth from "mammoth";
import { extractText, getMeta } from "unpdf";
import { countWords, type PageContent } from "./chunker";

export interface ExtractionResult {
  title?: string;
  text: string;
  pages: PageContent[];
  pageCount: number;
  wordCount: number;
  isScanned: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Normalizes document text while preserving headings, paragraphs, and code blocks.
 */
export function normalizeText(raw: string): string {
  if (!raw) return "";

  // Strip BOM if present
  let text = raw.replace(/^\uFEFF/, "");

  // Normalize Windows/Mac line endings to standard LF
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Replace non-breaking spaces with standard spaces
  text = text.replace(/\u00A0/g, " ");

  // Trim trailing spaces from lines but preserve markdown indentation (for lists and code)
  const lines = text.split("\n").map((line) => line.replace(/\s+$/, ""));

  // Collapse 3 or more consecutive newlines into 2
  text = lines.join("\n").replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Extracts text and metadata from a PDF buffer.
 */
export async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const meta = await getMeta(new Uint8Array(buffer)).catch(() => null);
    const pdfExtraction = await extractText(new Uint8Array(buffer), {
      mergePages: false,
    });

    const rawPages: string[] = Array.isArray(pdfExtraction.text)
      ? pdfExtraction.text
      : [String(pdfExtraction.text || "")];

    const pages: PageContent[] = [];
    let totalWords = 0;

    for (let i = 0; i < rawPages.length; i++) {
      const pageNum = i + 1;
      const pageCleanText = normalizeText(rawPages[i]);
      const words = countWords(pageCleanText);
      totalWords += words;

      pages.push({
        pageNumber: pageNum,
        text: pageCleanText,
      });
    }

    // Combined text
    const fullText = pages
      .filter((p) => p.text)
      .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join("\n\n");

    // Scanned document detection: if pages exist but no text layer was extractable
    const isScanned = pages.length > 0 && totalWords === 0;

    const title =
      (meta?.info as Record<string, unknown> | undefined)?.Title ||
      undefined;

    return {
      title: typeof title === "string" && title.trim() ? title.trim() : undefined,
      text: fullText,
      pages,
      pageCount: pdfExtraction.totalPages || pages.length || 1,
      wordCount: totalWords,
      isScanned,
      metadata: {
        format: "pdf",
        totalPages: pdfExtraction.totalPages || pages.length,
        author: (meta?.info as Record<string, unknown> | undefined)?.Author || null,
        creator: (meta?.info as Record<string, unknown> | undefined)?.Creator || null,
        isScanned,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to extract PDF text layer";
    console.warn("[PDF Extraction Warning]", msg);
    return {
      title: undefined,
      text: "",
      pages: [],
      pageCount: 1,
      wordCount: 0,
      isScanned: true,
      metadata: {
        format: "pdf",
        isScanned: true,
        extractionError: msg,
      },
    };
  }
}

/**
 * Extracts text and markdown formatting from a DOCX buffer.
 */
export async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  // Extract markdown representation to preserve headings (#, ##) and lists
  const mdResult = await (
    mammoth as unknown as {
      convertToMarkdown: (opts: { buffer: Buffer }) => Promise<{ value: string; messages: unknown[] }>;
    }
  ).convertToMarkdown({ buffer });
  const rawText = mdResult.value || "";
  const cleaned = normalizeText(rawText);
  const words = countWords(cleaned);

  return {
    text: cleaned,
    pages: [{ pageNumber: 1, text: cleaned }],
    pageCount: 1,
    wordCount: words,
    isScanned: false,
    metadata: {
      format: "docx",
      messages: mdResult.messages,
    },
  };
}

/**
 * Extracts text from a plain TXT buffer.
 */
export function extractFromTxt(buffer: Buffer): ExtractionResult {
  const raw = buffer.toString("utf-8");
  const cleaned = normalizeText(raw);
  const words = countWords(cleaned);

  return {
    text: cleaned,
    pages: [{ pageNumber: 1, text: cleaned }],
    pageCount: 1,
    wordCount: words,
    isScanned: false,
    metadata: {
      format: "txt",
    },
  };
}

/**
 * Extracts text from a Markdown (.md) buffer.
 */
export function extractFromMarkdown(buffer: Buffer): ExtractionResult {
  const raw = buffer.toString("utf-8");
  const cleaned = normalizeText(raw);
  const words = countWords(cleaned);

  // Extract top-level heading as suggested title if present
  const firstHeadingMatch = cleaned.match(/^#\s+(.+)$/m);
  const title = firstHeadingMatch ? firstHeadingMatch[1].trim() : undefined;

  return {
    title,
    text: cleaned,
    pages: [{ pageNumber: 1, text: cleaned }],
    pageCount: 1,
    wordCount: words,
    isScanned: false,
    metadata: {
      format: "markdown",
    },
  };
}

/**
 * Unified extractor based on file extension or MIME type.
 */
export async function extractDocument(
  buffer: Buffer,
  fileName: string,
  mimeType?: string,
): Promise<ExtractionResult> {
  const lower = fileName.toLowerCase();
  const ext = lower.split(".").pop() || "";

  if (ext === "pdf" || mimeType === "application/pdf") {
    return extractFromPdf(buffer);
  }

  if (
    ext === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractFromDocx(buffer);
  }

  if (ext === "md" || ext === "markdown" || mimeType === "text/markdown") {
    return extractFromMarkdown(buffer);
  }

  if (ext === "txt" || mimeType === "text/plain") {
    return extractFromTxt(buffer);
  }

  throw new Error(`Unsupported file type: .${ext || "unknown"}`);
}
