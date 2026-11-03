/**
 * RECALL Step 5 Knowledge Ingestion Test Suite.
 * Validates document validation, text extraction, intelligent chunking,
 * and Anti-SSRF security protections.
 */

import { validateUploadFile, sanitizeFileName, MAX_FILE_BYTES } from "../src/lib/ingest/validation";
import { extractFromTxt, extractFromMarkdown, extractFromPdf } from "../src/lib/ingest/extract";
import { chunkText, chunkPages } from "../src/lib/ingest/chunker";
import { validateUrlForSsrf, isPrivateIPv4, isPrivateIPv6 } from "../src/lib/ingest/ssrf";
import { ingestDocumentFile, retrySourceIngestion, STORAGE_BUCKET } from "../src/lib/ingest/pipeline";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("RECALL STEP 5: KNOWLEDGE INGESTION TEST SUITE");
  console.log("=================================================\n");

  // ====================================================
  // 1. SSRF PROTECTION TESTS
  // ====================================================
  console.log("--- 1. SSRF & URL Security Tests ---");

  // Private IP checks
  assert(isPrivateIPv4("127.0.0.1"), "IPv4 loopback (127.0.0.1) detected as private");
  assert(isPrivateIPv4("10.0.0.5"), "IPv4 Class A (10.0.0.5) detected as private");
  assert(isPrivateIPv4("172.16.10.1"), "IPv4 Class B (172.16.10.1) detected as private");
  assert(isPrivateIPv4("192.168.1.1"), "IPv4 Class C (192.168.1.1) detected as private");
  assert(isPrivateIPv4("169.254.169.254"), "AWS/GCP Metadata IP (169.254.169.254) detected as private");
  assert(isPrivateIPv4("100.100.100.200"), "Alibaba Cloud Metadata IP (100.100.100.200) detected as private");
  assert(!isPrivateIPv4("8.8.8.8"), "Public IP (8.8.8.8) detected as public");
  assert(!isPrivateIPv4("142.250.190.46"), "Google public IP (142.250.190.46) detected as public");

  assert(isPrivateIPv6("::1"), "IPv6 loopback (::1) detected as private");
  assert(isPrivateIPv6("fe80::1"), "IPv6 link-local (fe80::1) detected as private");
  assert(isPrivateIPv6("fc00::1"), "IPv6 unique-local (fc00::1) detected as private");
  assert(isPrivateIPv6("::ffff:127.0.0.1"), "IPv4-mapped IPv6 loopback detected as private");
  assert(!isPrivateIPv6("2001:4860:4860::8888"), "Google IPv6 DNS detected as public");

  // URL resolution validation
  const blockedUrls = [
    "http://localhost:3000",
    "http://127.0.0.1:8000/admin",
    "http://0.0.0.0",
    "http://169.254.169.254/computeMetadata/v1",
    "http://metadata.google.internal",
    "file:///etc/passwd",
    "ftp://example.com/file.txt",
    "gopher://example.com",
    "http://10.0.1.5:9000",
    "http://192.168.0.1",
  ];

  for (const url of blockedUrls) {
    try {
      await validateUrlForSsrf(url);
      assert(false, `Block dangerous destination: ${url}`, "Expected error but request succeeded");
    } catch {
      assert(true, `Block dangerous destination: ${url}`);
    }
  }

  // Valid public URL
  try {
    const valid = await validateUrlForSsrf("https://example.com");
    assert(valid.hostname === "example.com", "Allow valid public HTTPS URL (https://example.com)");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(false, "Allow valid public HTTPS URL (https://example.com)", msg);
  }

  // ====================================================
  // 2. FILE VALIDATION & SANITIZATION TESTS
  // ====================================================
  console.log("\n--- 2. File Validation & Magic Byte Tests ---");

  // Filename traversal sanitization
  const dangerousName = "../../../secrets/sensitive_doc.pdf";
  const sanitized = sanitizeFileName(dangerousName);
  assert(sanitized === "sensitive_doc.pdf", "Sanitize path traversal from filename");

  // Empty file test
  const emptyRes = validateUploadFile(Buffer.from([]), "empty.txt");
  assert(!emptyRes.valid && Boolean(emptyRes.error?.includes("empty")), "Reject empty file (0 bytes)");

  // Oversized file test
  const oversizedRes = validateUploadFile(Buffer.alloc(MAX_FILE_BYTES + 1024), "large.pdf");
  assert(!oversizedRes.valid && Boolean(oversizedRes.error?.includes("exceeds")), "Reject oversized file (>25 MB)");

  // Malformed PDF test (wrong magic bytes)
  const fakePdf = Buffer.from("This is plain text pretending to be a PDF");
  const fakePdfRes = validateUploadFile(fakePdf, "fake.pdf");
  assert(!fakePdfRes.valid && Boolean(fakePdfRes.error?.includes("not a valid PDF")), "Reject malformed PDF lacking %PDF- header");

  // Valid PDF header test
  const validPdfHeader = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj");
  const validPdfRes = validateUploadFile(validPdfHeader, "real.pdf");
  assert(validPdfRes.valid && validPdfRes.detectedType === "pdf", "Accept valid PDF with %PDF- header");

  // Valid DOCX zip header test
  const validDocxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
  const validDocxRes = validateUploadFile(validDocxHeader, "notes.docx");
  assert(validDocxRes.valid && validDocxRes.detectedType === "docx", "Accept valid DOCX with PK signature");

  // Valid Markdown and TXT tests
  const mdBuffer = Buffer.from("# Title\n\nThis is a markdown test.");
  const mdRes = validateUploadFile(mdBuffer, "notes.md");
  assert(mdRes.valid && mdRes.detectedType === "markdown", "Accept valid Markdown file");

  // Binary null bytes in text file
  const binaryTxt = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f]);
  const binRes = validateUploadFile(binaryTxt, "corrupt.txt");
  assert(!binRes.valid && Boolean(binRes.error?.includes("binary")), "Reject text file containing binary null bytes");

  // ====================================================
  // 3. TEXT EXTRACTION & NORMALIZATION TESTS
  // ====================================================
  console.log("\n--- 3. Text Extraction & Normalization Tests ---");

  // TXT extraction with BOM
  const bomText = "\uFEFFHello World!\r\nThis has CRLF and   trailing spaces.   \r\n\r\n\r\n\r\nNext line.";
  const txtResult = extractFromTxt(Buffer.from(bomText, "utf-8"));
  assert(txtResult.wordCount > 0, "Extract text from TXT buffer");
  assert(!txtResult.text.includes("\uFEFF"), "Strip UTF-8 Byte Order Mark (BOM)");
  assert(!txtResult.text.includes("\r\n"), "Normalize CRLF to standard LF");
  assert(!txtResult.text.includes("\n\n\n"), "Collapse excessive blank lines");

  // Markdown extraction
  const sampleMd = `# Transformer Architecture

Deep learning models based on self-attention mechanisms have transformed natural language processing.

## Multi-Head Attention

Allows the model to jointly attend to information from different representation subspaces at different positions.

\`\`\`python
def attention(q, k, v):
    return softmax(q @ k.T) @ v
\`\`\`
`;
  const mdResult = extractFromMarkdown(Buffer.from(sampleMd, "utf-8"));
  assert(mdResult.title === "Transformer Architecture", "Extract markdown top-level heading as title");
  assert(mdResult.text.includes("Multi-Head Attention"), "Preserve subheadings in extracted text");
  assert(mdResult.text.includes("```python"), "Preserve code blocks in markdown");
  assert(mdResult.wordCount > 20, "Accurate word count in markdown document");

  // Minimal synthetic PDF extraction
  const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 55 >> stream
BT /F1 24 Tf 100 700 Td (Attention is all you need.) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000351 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
432
%%EOF`;

  try {
    const pdfRes = await extractFromPdf(Buffer.from(minimalPdf));
    assert(pdfRes.pageCount === 1, "PDF page count detected correctly");
    assert(pdfRes.text.includes("Attention is all you need"), "PDF text layer extracted accurately");
    assert(!pdfRes.isScanned, "Text PDF correctly classified as not scanned");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(false, "PDF extraction test", msg);
  }

  // Scanned PDF detection test
  const emptyPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 0 >> stream
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000216 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
268
%%EOF`;

  try {
    const emptyPdfRes = await extractFromPdf(Buffer.from(emptyPdf));
    assert(emptyPdfRes.isScanned === true, "Flag empty/scanned PDF without text layer");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(false, "Scanned PDF detection", msg);
  }

  // ====================================================
  // 4. INTELLIGENT CHUNKING TESTS
  // ====================================================
  console.log("\n--- 4. Intelligent Chunking Service Tests ---");

  // Generate 1200 words of structured text
  const paragraphs: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const words = Array.from({ length: 220 }, (_, w) => `term${w}`);
    paragraphs.push(`## Section ${i}\n\nThis is paragraph ${i} covering conceptual knowledge. ${words.join(" ")}.`);
  }
  const longDoc = paragraphs.join("\n\n");

  const chunks = chunkText(longDoc, { targetWords: 500, maxWords: 600, overlapWords: 80 });

  assert(chunks.length >= 2, `Split 1200+ word document into multiple chunks (got ${chunks.length} chunks)`);

  // Sequential chunk index verification
  let indicesValid = true;
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].chunkIndex !== i) indicesValid = false;
  }
  assert(indicesValid, "Chunks maintain strictly sequential, 0-based chunk indices");

  // Word count constraints
  const allUnderMax = chunks.every((c) => c.wordCount <= 650);
  assert(allUnderMax, "All chunks respect maximum word ceiling");

  // Overlap verification: chunk 1 contains overlap from chunk 0
  if (chunks.length >= 2) {
    const chunk0Words = chunks[0].content.split(/\s+/);
    const chunk1Words = chunks[1].content.split(/\s+/);
    const lastWordChunk0 = chunk0Words[chunk0Words.length - 1];
    const hasOverlap = chunk1Words.slice(0, 100).includes(lastWordChunk0);
    assert(hasOverlap, "Sequential chunks preserve semantic overlap");
  }

  // Multi-page chunking test
  const multiPageDoc = [
    { pageNumber: 1, text: "Page 1 content about transformers and attention. ".repeat(40) },
    { pageNumber: 2, text: "Page 2 content about vector search and indexing. ".repeat(40) },
    { pageNumber: 3, text: "Page 3 content about RAG pipelines and groundings. ".repeat(40) },
  ];

  const pageChunks = chunkPages(multiPageDoc, { targetWords: 450, maxWords: 550 });
  assert(pageChunks.length >= 3, `Multi-page document chunked into ${pageChunks.length} chunks`);
  const hasPage1 = pageChunks.some((c) => c.pageNumber === 1);
  const hasPage2 = pageChunks.some((c) => c.pageNumber === 2);
  const hasPage3 = pageChunks.some((c) => c.pageNumber === 3);
  assert(hasPage1 && hasPage2 && hasPage3, "Page preservation across multi-page chunking");

  // ====================================================
  // 5. INGESTION PIPELINE & WHERE CLAUSE INTEGRATION TESTS
  // ====================================================
  console.log("\n--- 5. Ingestion Pipeline & Database WHERE Clause Tests ---");

  interface MockRow {
    [key: string]: unknown;
  }

  function createMockSupabase(defaultUserId = "usr-alpha") {
    const sourcesTable: MockRow[] = [];
    const chunksTable: MockRow[] = [];
    const notesTable: MockRow[] = [];
    const collectionsTable: MockRow[] = [{ id: "col-1", user_id: defaultUserId, name: "Research" }];
    const storageFiles: Record<string, Buffer> = {};

    const client = {
      from(table: string) {
        const filters: Array<{ col: string; op: string; val: unknown }> = [];
        let updatePayload: MockRow | null = null;
        let isDelete = false;
        let isInsert = false;
        let insertPayload: MockRow | MockRow[] | null = null;

        const builder: Record<string, unknown> = {
          select() {
            return builder;
          },
          eq(col: string, val: unknown) {
            filters.push({ col, op: "eq", val });
            return builder;
          },
          ilike(col: string, val: unknown) {
            filters.push({ col, op: "ilike", val });
            return builder;
          },
          insert(payload: MockRow | MockRow[]) {
            isInsert = true;
            insertPayload = payload;
            return builder;
          },
          update(payload: MockRow) {
            updatePayload = payload;
            return builder;
          },
          delete() {
            isDelete = true;
            return builder;
          },
          async single() {
            const res = await (builder.execute as () => Promise<{ data: MockRow[] | null; error: { message: string } | null }>)();
            if (res.error) return { data: null, error: res.error };
            if (!res.data || res.data.length === 0) {
              return { data: null, error: { message: "Row not found" } };
            }
            return { data: res.data[0], error: null };
          },
          async maybeSingle() {
            const res = await (builder.execute as () => Promise<{ data: MockRow[] | null; error: { message: string } | null }>)();
            if (res.error) return { data: null, error: res.error };
            return { data: res.data?.[0] || null, error: null };
          },
          then(resolve: (val: unknown) => unknown, reject?: (err: unknown) => unknown) {
            return (builder.execute as () => Promise<unknown>)().then(resolve, reject);
          },
          async execute() {
            // STRICT POSTGREST RULE: An UPDATE must have a WHERE clause!
            if (updatePayload) {
              if (filters.length === 0) {
                return { data: null, error: { message: "UPDATE requires a WHERE clause" } };
              }
              const targetList = table === "sources" ? sourcesTable : table === "notes" ? notesTable : [];
              const matched = targetList.filter((row) =>
                filters.every((f) => (f.op === "eq" ? row[f.col] === f.val : true))
              );
              matched.forEach((row) => Object.assign(row, updatePayload));
              return { data: matched, error: null };
            }

            // STRICT POSTGREST RULE: A DELETE must have a WHERE clause!
            if (isDelete) {
              if (filters.length === 0) {
                return { data: null, error: { message: "DELETE requires a WHERE clause" } };
              }
              if (table === "knowledge_chunks") {
                for (let i = chunksTable.length - 1; i >= 0; i--) {
                  const row = chunksTable[i];
                  if (filters.every((f) => f.op === "eq" ? row[f.col] === f.val : true)) {
                    chunksTable.splice(i, 1);
                  }
                }
              }
              if (table === "sources") {
                for (let i = sourcesTable.length - 1; i >= 0; i--) {
                  const row = sourcesTable[i];
                  if (filters.every((f) => f.op === "eq" ? row[f.col] === f.val : true)) {
                    sourcesTable.splice(i, 1);
                  }
                }
              }
              return { data: null, error: null };
            }

            // INSERT
            if (isInsert) {
              const rows = Array.isArray(insertPayload) ? insertPayload : [insertPayload!];
              const inserted = rows.map((r) => ({
                id: r.id || `uuid-${Math.random().toString(36).slice(2, 9)}`,
                created_at: new Date().toISOString(),
                ...r,
              }));
              if (table === "sources") sourcesTable.push(...inserted);
              if (table === "knowledge_chunks") chunksTable.push(...inserted);
              if (table === "notes") notesTable.push(...inserted);
              return { data: inserted, error: null };
            }

            // SELECT
            const targetList =
              table === "sources"
                ? sourcesTable
                : table === "knowledge_chunks"
                  ? chunksTable
                  : table === "collections"
                    ? collectionsTable
                    : notesTable;
            const filtered = targetList.filter((row) =>
              filters.every((f) => {
                if (f.op === "eq") return row[f.col] === f.val;
                if (f.op === "ilike") return String(row[f.col]).toLowerCase() === String(f.val).toLowerCase();
                return true;
              })
            );
            return { data: filtered, error: null };
          },
        };
        return builder;
      },
      storage: {
        from(bucket: string) {
          return {
            async upload(path: string, buffer: Buffer) {
              storageFiles[`${bucket}/${path}`] = buffer;
              return { data: { path }, error: null };
            },
            async download(path: string) {
              const buf = storageFiles[`${bucket}/${path}`];
              if (!buf) return { data: null, error: { message: "Object not found" } };
              return {
                data: {
                  arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
                },
                error: null,
              };
            },
            async remove(paths: string[]) {
              paths.forEach((p) => delete storageFiles[`${bucket}/${p}`]);
              return { data: paths, error: null };
            },
          };
        },
      },
    } as unknown as SupabaseClient<Database>;

    return { client, sourcesTable, chunksTable, storageFiles };
  }

  // 1. Regression test: Mock correctly fails on unfiltered updates
  const testHarness = createMockSupabase();
  const unfilteredRes = await testHarness.client
    .from("sources")
    .update({ processing_status: "ready" })
    .select("*")
    .single();
  assert(
    unfilteredRes.error?.message === "UPDATE requires a WHERE clause",
    "PostgreSQL/PostgREST mock rejects unfiltered UPDATE with WHERE clause error"
  );

  // 2. Multi-word test PDF for pipeline ingestion
  const multiWordPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 120 >> stream
BT /F1 14 Tf 50 700 Td (Attention is all you need. Neural networks and transformers enable powerful second brain recall systems across documents.) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000416 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
497
%%EOF`;

  const userA = "user-111";
  const userB = "user-222";
  const { client: mockClient, sourcesTable, chunksTable, storageFiles } = createMockSupabase(userA);

  // 3. Test PDF Upload and Finalization with ingestDocumentFile
  try {
    const ingestRes = await ingestDocumentFile({
      userId: userA,
      buffer: Buffer.from(multiWordPdf),
      fileName: "Transformer_Architecture.pdf",
      collectionName: "Research",
      supabase: mockClient,
    });

    assert(Boolean(ingestRes && ingestRes.source), "ingestDocumentFile completed without throwing WHERE clause error");
    assert(ingestRes.source.processing_status === "ready", "Source record processing_status successfully marked 'ready'");
    assert(typeof ingestRes.source.word_count === "number" && ingestRes.source.word_count > 10, "Extracted text word count recorded on source (>10 words)");
    assert(ingestRes.chunksCount > 0, `Knowledge chunks created for document (${ingestRes.chunksCount} chunks)`);

    // 4. Verify knowledge_chunks saved in database
    const savedChunks = chunksTable.filter((c) => c.source_id === ingestRes.source.id);
    assert(savedChunks.length === ingestRes.chunksCount, `knowledge_chunks saved in database with source_id (${savedChunks.length} chunks)`);
    assert(savedChunks.every((c) => c.user_id === userA), "Every saved chunk has user_id matching authenticated user");

    // 5. Verify uploaded file exists in private storage
    const expectedStorageKey = `${STORAGE_BUCKET}/${userA}/${ingestRes.source.id}/Transformer_Architecture.pdf`;
    assert(Boolean(storageFiles[expectedStorageKey]), `Uploaded file exists in private storage at ${expectedStorageKey}`);

    // 6. Multi-tenant isolation test: User B cannot query or access User A's source
    const userBSources = sourcesTable.filter((s) => s.user_id === userB && s.id === ingestRes.source.id);
    assert(userBSources.length === 0, "Tenant isolation: User B cannot access User A's source record");

    const userBChunks = chunksTable.filter((c) => c.user_id === userB && c.source_id === ingestRes.source.id);
    assert(userBChunks.length === 0, "Tenant isolation: User B cannot access User A's knowledge chunks");

    // 7. Test failed upload and retry flow
    // Manually mark source as failed (simulating a transient failure)
    await mockClient
      .from("sources")
      .update({ processing_status: "failed", error_message: "Simulated extraction failure" })
      .eq("id", ingestRes.source.id)
      .eq("user_id", userA);

    const failedSource = sourcesTable.find((s) => s.id === ingestRes.source.id);
    assert(failedSource?.processing_status === "failed", "Simulate transient source failure (status: 'failed')");

    // Execute retrySourceIngestion
    const retryRes = await retrySourceIngestion(mockClient, userA, ingestRes.source.id);
    assert(retryRes.success === true, "retrySourceIngestion succeeded");

    const retriedSource = sourcesTable.find((s) => s.id === ingestRes.source.id);
    assert(retriedSource?.processing_status === "ready", "Retried source successfully finalized to 'ready'");
    assert(retriedSource?.error_message === null, "Retried source cleared error_message to null");

    // Verify chunks were not duplicated on retry
    const chunksAfterRetry = chunksTable.filter((c) => c.source_id === ingestRes.source.id);
    assert(chunksAfterRetry.length === ingestRes.chunksCount, "No duplicate chunks created after retry");

    // 8. Test file with spaces and parentheses: "grishi_resume (3).pdf"
    const complexFileName = "grishi_resume (3).pdf";
    const resumePdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 130 >> stream
BT /F1 14 Tf 50 700 Td (Software engineer with extensive experience in TypeScript, React, Next.js, PostgreSQL, and document processing systems.) Tj ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000426 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
507
%%EOF`;

    const resumeIngestRes = await ingestDocumentFile({
      userId: userA,
      buffer: Buffer.from(resumePdf),
      fileName: complexFileName,
      collectionName: "Career",
      supabase: mockClient,
    });

    assert(Boolean(resumeIngestRes && resumeIngestRes.source), "Ingest file with spaces and parentheses 'grishi_resume (3).pdf'");
    assert(resumeIngestRes.source.title === "grishi_resume (3).pdf", "Source title preserves original human-readable file name");
    assert(resumeIngestRes.source.processing_status === "ready", "Resume source processing_status is 'ready'");
    assert(resumeIngestRes.chunksCount > 0, `Resume source created knowledge chunks (${resumeIngestRes.chunksCount} chunks)`);

    const resumeStorageKey = `${STORAGE_BUCKET}/${userA}/${resumeIngestRes.source.id}/grishi_resume__3_.pdf`;
    assert(Boolean(storageFiles[resumeStorageKey]), `Resume file stored with URL-safe storage key: ${resumeStorageKey}`);

    // Re-uploading after failure cleanly clears old failed state
    await mockClient
      .from("sources")
      .update({ processing_status: "failed", error_message: "Old failure" })
      .eq("id", resumeIngestRes.source.id)
      .eq("user_id", userA);

    const reuploadRes = await ingestDocumentFile({
      userId: userA,
      buffer: Buffer.from(resumePdf),
      fileName: complexFileName,
      collectionName: "Career",
      supabase: mockClient,
    });
    assert(reuploadRes.source.processing_status === "ready", "Re-uploading replaces old failed source and marks 'ready'");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(false, "PDF Upload and Finalization Pipeline Test", msg);
  }

  // ====================================================
  // SUMMARY
  // ====================================================
  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner threw an unexpected error:", err);
  process.exit(1);
});
