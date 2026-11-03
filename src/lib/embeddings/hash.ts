import { createHash } from "crypto";

/**
 * Computes a deterministic SHA-256 hash of text content, model identifier,
 * and document title to enable vector caching, change detection, and deduplication.
 */
export function computeContentHash(
  content: string,
  model: string,
  title?: string | null
): string {
  // Normalize whitespace and line endings to prevent spurious hash mismatches
  const normalizedText = content.replace(/\r\n/g, "\n").trim();
  const normalizedTitle = (title || "").trim();
  return createHash("sha256")
    .update(`${model}:${normalizedTitle}:${normalizedText}`, "utf8")
    .digest("hex");
}
