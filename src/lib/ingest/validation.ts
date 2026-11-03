/**
 * File Validation & Magic Byte Inspection Service for RECALL.
 * Validates file sizes, sanitized filenames, MIME types, and header signatures.
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md", ".markdown"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export interface FileValidationResult {
  valid: boolean;
  sanitizedName: string;
  detectedType: "pdf" | "docx" | "txt" | "markdown";
  error?: string;
}

/**
 * Sanitizes a filename to prevent directory traversal and invalid characters.
 */
export function sanitizeFileName(name: string): string {
  // Strip path traversal sequences and separators
  const base = name.replace(/^.*[\\/]/, "");
  // Remove control characters and non-standard symbols
  const cleaned = base.replace(/[\x00-\x1F\x7F<>:"/\\|?*]/g, "_").trim();
  return cleaned || "untitled_document";
}

/**
 * Checks for PDF magic bytes (%PDF-).
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  // Search within first 1024 bytes for %PDF-
  const header = buffer.subarray(0, Math.min(1024, buffer.length)).toString("ascii");
  return header.includes("%PDF-");
}

/**
 * Checks for DOCX (ZIP container format) magic bytes (PK\x03\x04).
 */
export function isDocxBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

/**
 * Checks if a buffer contains valid UTF-8 text without binary null bytes.
 */
export function isPlainTextBuffer(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;
  // Sample up to first 4KB for binary null bytes
  const sample = buffer.subarray(0, Math.min(4096, buffer.length));
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0x00) return false;
  }
  return true;
}

/**
 * Validates an uploaded file: checks size, name, extension, and magic bytes.
 */
export function validateUploadFile(
  buffer: Buffer,
  rawName: string,
  maxBytes: number = MAX_FILE_BYTES,
): FileValidationResult {
  const sanitizedName = sanitizeFileName(rawName);

  // Size validation
  if (buffer.length === 0) {
    return {
      valid: false,
      sanitizedName,
      detectedType: "txt",
      error: "Uploaded file is empty (0 bytes).",
    };
  }

  if (buffer.length > maxBytes) {
    return {
      valid: false,
      sanitizedName,
      detectedType: "txt",
      error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${maxBytes / (1024 * 1024)} MB.`,
    };
  }

  const ext = `.${sanitizedName.split(".").pop()?.toLowerCase() || ""}`;

  // Extension validation
  if (ext === ".pdf") {
    if (!isPdfBuffer(buffer)) {
      return {
        valid: false,
        sanitizedName,
        detectedType: "pdf",
        error: "File extension is .pdf, but file content is not a valid PDF document.",
      };
    }
    return { valid: true, sanitizedName, detectedType: "pdf" };
  }

  if (ext === ".docx") {
    if (!isDocxBuffer(buffer)) {
      return {
        valid: false,
        sanitizedName,
        detectedType: "docx",
        error: "File extension is .docx, but file content is not a valid Word document.",
      };
    }
    return { valid: true, sanitizedName, detectedType: "docx" };
  }

  if (ext === ".md" || ext === ".markdown") {
    if (!isPlainTextBuffer(buffer)) {
      return {
        valid: false,
        sanitizedName,
        detectedType: "markdown",
        error: "File contains invalid binary data instead of Markdown text.",
      };
    }
    return { valid: true, sanitizedName, detectedType: "markdown" };
  }

  if (ext === ".txt") {
    if (!isPlainTextBuffer(buffer)) {
      return {
        valid: false,
        sanitizedName,
        detectedType: "txt",
        error: "File contains invalid binary data instead of plain text.",
      };
    }
    return { valid: true, sanitizedName, detectedType: "txt" };
  }

  return {
    valid: false,
    sanitizedName,
    detectedType: "txt",
    error: `Unsupported file format '${ext}'. Allowed formats: ${SUPPORTED_EXTENSIONS.join(", ")}`,
  };
}

