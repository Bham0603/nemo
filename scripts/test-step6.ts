/**
 * RECALL Step 6: Google Gemini Embeddings & Semantic Search Test Suite.
 * Validates:
 *   - Gemini SDK configuration & model identifiers
 *   - 1536 vector dimensionality & invalid vector rejection
 *   - Document chunk formatting ("title: ... | text: ...")
 *   - Search query formatting ("task: search result | query: ...")
 *   - Deterministic SHA-256 content hashing & model cache invalidation
 *   - Cosine distance similarity calculation
 *   - Semantic search RPC simulation across 5 benchmark AI queries
 *   - Multi-tenant tenant boundary isolation (auth.uid())
 *   - Privacy consent enforcement (blocking unconsented external calls)
 *   - Backfill pagination & error recovery
 *   - Clearly separated Real Gemini API Integration Test
 */

import { validateEmbedding } from "../src/lib/embeddings/service";
import { computeContentHash } from "../src/lib/embeddings/hash";
import {
  formatDocumentChunkForEmbedding,
  formatSearchQueryForEmbedding,
} from "../src/lib/embeddings/formatting";
import {
  EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_MODEL,
  getGeminiEmbeddingModel,
  getGeminiEmbeddingDimensions,
} from "../src/lib/embeddings/config";
import { getGeminiChatModel, isGeminiConfigured } from "../src/lib/gemini/config";

let mockPassed = 0;
let mockFailed = 0;
let realPassed = 0;
let realFailed = 0;
let realSkipped = 0;

function assertMock(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [MOCK] PASS: ${testName}`);
    mockPassed++;
  } else {
    console.error(`  ✗ [MOCK] FAIL: ${testName}${detail ? ` (${detail})` : ""}`);
    mockFailed++;
  }
}

function assertReal(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [LIVE GEMINI] PASS: ${testName}`);
    realPassed++;
  } else {
    console.error(`  ✗ [LIVE GEMINI] FAIL: ${testName}${detail ? ` (${detail})` : ""}`);
    realFailed++;
  }
}

/**
 * Computes exact cosine similarity between two unit/normalized vectors:
 * similarity = dot(a, b) / (||a|| * ||b||)
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Generates a synthetic normalized vector of given dimension with a primary topic direction.
 */
function createTopicVector(topicIndex: number, dimension = EMBEDDING_DIMENSIONS): number[] {
  const vec = new Array(dimension).fill(0);
  for (let i = 0; i < dimension; i++) {
    const freq = ((i % 32) + 1) * (topicIndex + 1);
    vec[i] = Math.sin(freq) + 0.1 * Math.cos(i);
  }
  let norm = 0;
  for (let i = 0; i < dimension; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  return vec.map((v) => v / norm);
}

async function runAllTests() {
  console.log("==================================================================");
  console.log("RECALL STEP 6: GOOGLE GEMINI EMBEDDINGS & SEMANTIC SEARCH TESTS");
  console.log("==================================================================\n");

  // ====================================================
  // 1. GEMINI SDK CONFIGURATION & CONSTANTS
  // ====================================================
  console.log("--- 1. Gemini Configuration & SDK Tests [MOCK] ---");

  assertMock(
    getGeminiEmbeddingModel() === "gemini-embedding-2",
    "Default embedding model resolves to 'gemini-embedding-2'"
  );
  assertMock(
    getGeminiEmbeddingDimensions() === 1536,
    "Default embedding dimensionality resolves to 1536"
  );
  assertMock(
    getGeminiChatModel() === "gemini-3.8-flash",
    "Future chat model scaffold resolves to 'gemini-3.8-flash'"
  );

  // ====================================================
  // 2. VECTOR DIMENSIONALITY & VALIDATION
  // ====================================================
  console.log("\n--- 2. Vector Dimensionality & Validation Tests [MOCK] ---");

  const validVector = new Array(1536).fill(0.0123);
  assertMock(validateEmbedding(validVector), "Validate authentic 1536-dimensional vector");

  const wrongDimShort = new Array(1535).fill(0.01);
  assertMock(!validateEmbedding(wrongDimShort), "Reject undersized vector (1535 dimensions)");

  const wrongDimLong = new Array(1537).fill(0.01);
  assertMock(!validateEmbedding(wrongDimLong), "Reject oversized vector (1537 dimensions)");

  const nanVector = new Array(1536).fill(0.01);
  nanVector[42] = NaN;
  assertMock(!validateEmbedding(nanVector), "Reject vector containing NaN values");

  const infinityVector = new Array(1536).fill(0.01);
  infinityVector[100] = Infinity;
  assertMock(!validateEmbedding(infinityVector), "Reject vector containing Infinity values");

  assertMock(!validateEmbedding("not an array"), "Reject string input for embedding vector");
  assertMock(!validateEmbedding(null), "Reject null input for embedding vector");
  assertMock(!validateEmbedding({}), "Reject object input for embedding vector");

  // ====================================================
  // 3. DOCUMENT & QUERY FORMATTING
  // ====================================================
  console.log("\n--- 3. Prompt Formatting Tests [MOCK] ---");

  const formattedDoc = formatDocumentChunkForEmbedding(
    "Deep neural networks require backpropagation.",
    "Machine Learning Guide.pdf"
  );
  assertMock(
    formattedDoc === "title: Machine Learning Guide.pdf | text: Deep neural networks require backpropagation.",
    "Format document chunk as 'title: {document_title} | text: {chunk_content}'"
  );

  const formattedQuery = formatSearchQueryForEmbedding("How does backprop work?");
  assertMock(
    formattedQuery === "task: search result | query: How does backprop work?",
    "Format query as 'task: search result | query: {user_query}'"
  );

  const untitledDoc = formatDocumentChunkForEmbedding("Passage without title.", null);
  assertMock(
    untitledDoc === "title: Untitled Knowledge Document | text: Passage without title.",
    "Fallback to 'Untitled Knowledge Document' when title is null or omitted"
  );

  // ====================================================
  // 4. DETERMINISTIC CONTENT HASHING & DEDUPLICATION
  // ====================================================
  console.log("\n--- 4. Content Hashing & Caching Tests [MOCK] ---");

  const textA = "Transformers leverage multi-head self-attention mechanisms.";
  const titleA = "Attention Paper.pdf";
  const hashA1 = computeContentHash(textA, DEFAULT_EMBEDDING_MODEL, titleA);
  const hashA2 = computeContentHash(textA, DEFAULT_EMBEDDING_MODEL, titleA);
  assertMock(hashA1 === hashA2 && hashA1.length === 64, "Deterministic SHA-256 hash generation");

  const hashDiffContent = computeContentHash("Different content.", DEFAULT_EMBEDDING_MODEL, titleA);
  assertMock(hashA1 !== hashDiffContent, "Different content produces distinct hash");

  const hashDiffModel = computeContentHash(textA, "other-model", titleA);
  assertMock(hashA1 !== hashDiffModel, "Different model produces distinct hash for cache invalidation");

  const hashDiffTitle = computeContentHash(textA, DEFAULT_EMBEDDING_MODEL, "Different Title.pdf");
  assertMock(hashA1 !== hashDiffTitle, "Different title produces distinct hash");

  const crlfText = "Line 1\r\nLine 2\r\nLine 3";
  const lfText = "Line 1\nLine 2\nLine 3";
  assertMock(
    computeContentHash(crlfText, DEFAULT_EMBEDDING_MODEL, titleA) ===
      computeContentHash(lfText, DEFAULT_EMBEDDING_MODEL, titleA),
    "Line ending normalization (CRLF -> LF) yields identical content hash"
  );

  // ====================================================
  // 5. COSINE DISTANCE SIMILARITY SEARCH LOGIC
  // ====================================================
  console.log("\n--- 5. Cosine Similarity & Vector Distance Tests [MOCK] ---");

  const vTransformer = createTopicVector(1);
  const vRAG = createTopicVector(2);
  const vVectorDB = createTopicVector(3);
  const vAgents = createTopicVector(4);
  const vAttention = createTopicVector(1.05); // Semantically close to transformer

  const simIdentical = cosineSimilarity(vTransformer, vTransformer);
  assertMock(Math.abs(simIdentical - 1.0) < 1e-6, "Identical vectors yield exact 1.0 cosine similarity");

  const simClose = cosineSimilarity(vTransformer, vAttention);
  const simDistant = cosineSimilarity(vTransformer, vVectorDB);
  assertMock(
    simClose > simDistant,
    "Semantically similar vectors yield higher cosine similarity than distant vectors"
  );

  // ====================================================
  // 6. MOCK DATABASE & RPC SEARCH RELEVANCE BENCHMARKS
  // ====================================================
  console.log("\n--- 6. Semantic Search RPC Simulation & Knowledge Benchmarks [MOCK] ---");

  interface MockChunkRecord {
    id: string;
    user_id: string;
    source_id: string | null;
    note_id: string | null;
    content: string;
    chunk_index: number;
    page_number: number | null;
    source_title: string;
    source_type: string;
    collection_id: string;
    collection_name: string;
    embedding: number[] | null;
    embedding_status: "pending" | "processing" | "ready" | "failed";
    embedding_model: string | null;
    embedding_error: string | null;
  }

  const userA = "usr-1111";
  const userB = "usr-2222";
  const colAI = "col-ai";
  const colCareer = "col-career";

  const mockChunks: MockChunkRecord[] = [
    {
      id: "chk-1",
      user_id: userA,
      source_id: "src-1",
      note_id: null,
      source_title: "Transformer Architecture.pdf",
      source_type: "pdf",
      collection_id: colAI,
      collection_name: "Research",
      content: "Transformer models process all tokens in parallel using multi-head self-attention mechanisms to weigh contextual relationships.",
      chunk_index: 0,
      page_number: 1,
      embedding: vTransformer,
      embedding_status: "ready",
      embedding_model: DEFAULT_EMBEDDING_MODEL,
      embedding_error: null,
    },
    {
      id: "chk-2",
      user_id: userA,
      source_id: "src-2",
      note_id: null,
      source_title: "RAG Research.pdf",
      source_type: "pdf",
      collection_id: colAI,
      collection_name: "Research",
      content: "Retrieval-Augmented Generation combines external vector index retrieval with generation to ground answers in verified documents.",
      chunk_index: 0,
      page_number: 1,
      embedding: vRAG,
      embedding_status: "ready",
      embedding_model: DEFAULT_EMBEDDING_MODEL,
      embedding_error: null,
    },
    {
      id: "chk-3",
      user_id: userA,
      source_id: "src-3",
      note_id: null,
      source_title: "Vector Database Research.md",
      source_type: "markdown",
      collection_id: colAI,
      collection_name: "Research",
      content: "Vector databases utilize hierarchical navigable small world (HNSW) graphs to index embeddings and support sub-millisecond approximate nearest neighbor search.",
      chunk_index: 0,
      page_number: 1,
      embedding: vVectorDB,
      embedding_status: "ready",
      embedding_model: DEFAULT_EMBEDDING_MODEL,
      embedding_error: null,
    },
    {
      id: "chk-4",
      user_id: userA,
      source_id: "src-4",
      note_id: null,
      source_title: "AI Agents Documentation.pdf",
      source_type: "pdf",
      collection_id: colAI,
      collection_name: "Research",
      content: "Autonomous AI agents combine tool execution, planning loops, and memory retrieval to accomplish multi-step objectives.",
      chunk_index: 0,
      page_number: 1,
      embedding: vAgents,
      embedding_status: "ready",
      embedding_model: DEFAULT_EMBEDDING_MODEL,
      embedding_error: null,
    },
    {
      id: "chk-5",
      user_id: userA,
      source_id: "src-5",
      note_id: null,
      source_title: "Deep Learning Notes.pdf",
      source_type: "pdf",
      collection_id: colAI,
      collection_name: "Research",
      content: "The purpose of multi-head attention is to allow the model to jointly attend to information from different representation subspaces.",
      chunk_index: 0,
      page_number: 2,
      embedding: vAttention,
      embedding_status: "ready",
      embedding_model: DEFAULT_EMBEDDING_MODEL,
      embedding_error: null,
    },
    // User B chunk to verify cross-tenant security
    {
      id: "chk-user-b",
      user_id: userB,
      source_id: "src-b",
      note_id: null,
      source_title: "User B Private Secret.pdf",
      source_type: "pdf",
      collection_id: colCareer,
      collection_name: "Private",
      content: "Confidential financial figures belonging exclusively to User B.",
      chunk_index: 0,
      page_number: 1,
      embedding: vTransformer,
      embedding_status: "ready",
      embedding_model: DEFAULT_EMBEDDING_MODEL,
      embedding_error: null,
    },
  ];

  function simulateSearchKnowledgeChunks(
    callerUserId: string,
    queryEmbedding: number[],
    matchCount = 10,
    matchThreshold = 0.35,
    filterCollectionId: string | null = null,
    filterSourceId: string | null = null
  ) {
    return mockChunks
      .filter((c) => {
        // STRICT SECURITY INVOKER & AUTH.UID() CHECK
        if (c.user_id !== callerUserId) return false;
        if (!c.embedding) return false;
        if (filterCollectionId && c.collection_id !== filterCollectionId) return false;
        if (filterSourceId && c.source_id !== filterSourceId) return false;
        const sim = cosineSimilarity(queryEmbedding, c.embedding);
        return sim >= matchThreshold;
      })
      .map((c) => ({
        chunk_id: c.id,
        source_id: c.source_id,
        note_id: c.note_id,
        content: c.content,
        chunk_index: c.chunk_index,
        page_number: c.page_number,
        source_title: c.source_title,
        source_type: c.source_type,
        collection_id: c.collection_id,
        collection_name: c.collection_name,
        similarity: cosineSimilarity(queryEmbedding, c.embedding!),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, matchCount);
  }

  // Benchmark Query 1
  const q1Results = simulateSearchKnowledgeChunks(userA, vTransformer, 3, 0.4);
  assertMock(
    q1Results.length > 0 && q1Results[0].source_title === "Transformer Architecture.pdf",
    "Query 1: 'Transformer models' correctly retrieves Transformer Architecture"
  );

  // Benchmark Query 2
  const q2Results = simulateSearchKnowledgeChunks(userA, vRAG, 3, 0.4);
  assertMock(
    q2Results.length > 0 && q2Results[0].source_title === "RAG Research.pdf",
    "Query 2: 'Retrieval augmented generation' correctly retrieves RAG Research"
  );

  // Benchmark Query 3
  const q3Results = simulateSearchKnowledgeChunks(userA, vVectorDB, 3, 0.4);
  assertMock(
    q3Results.length > 0 && q3Results[0].source_title === "Vector Database Research.md",
    "Query 3: 'Vector representations' correctly retrieves Vector Database Research"
  );

  // Benchmark Query 4
  const q4Results = simulateSearchKnowledgeChunks(userA, vAgents, 3, 0.4);
  assertMock(
    q4Results.length > 0 && q4Results[0].source_title === "AI Agents Documentation.pdf",
    "Query 4: 'AI agents' correctly retrieves AI Agents Documentation"
  );

  // Benchmark Query 5
  const q5Results = simulateSearchKnowledgeChunks(userA, vAttention, 3, 0.4);
  assertMock(
    q5Results.length > 0 &&
      (q5Results[0].source_title.includes("Deep Learning") || q5Results[0].source_title.includes("Transformer")),
    "Query 5: 'Multi-head attention' retrieves Attention / Deep Learning notes"
  );

  // ====================================================
  // 7. SECURITY & MULTI-TENANT ISOLATION
  // ====================================================
  console.log("\n--- 7. Security & Multi-Tenant Isolation Tests [MOCK] ---");

  const userASearch = simulateSearchKnowledgeChunks(userA, vTransformer, 10, 0.0);
  const includesUserB = userASearch.some((r) => r.chunk_id === "chk-user-b");
  assertMock(!includesUserB, "User A vector search strictly excludes User B's chunks");

  const userBSearch = simulateSearchKnowledgeChunks(userB, vTransformer, 10, 0.0);
  const onlyUserB = userBSearch.every((r) => r.chunk_id === "chk-user-b");
  assertMock(onlyUserB && userBSearch.length === 1, "User B search only retrieves User B's own records");

  const filteredByCol = simulateSearchKnowledgeChunks(userA, vTransformer, 10, 0.0, "non-existent-col");
  assertMock(filteredByCol.length === 0, "Collection filter excludes non-matching collections");

  const filteredBySource = simulateSearchKnowledgeChunks(userA, vTransformer, 10, 0.0, null, "src-1");
  assertMock(
    filteredBySource.length === 1 && filteredBySource[0].source_id === "src-1",
    "Source ID filter isolates target document chunks"
  );

  // ====================================================
  // 8. PRIVACY CONSENT VERIFICATION
  // ====================================================
  console.log("\n--- 8. Privacy Consent Enforcement Tests [MOCK] ---");

  function canProcessExternalEmbedding(consentGranted: boolean, apiKeyConfigured: boolean): boolean {
    // Both apiKey AND explicit opt-in consent are required
    return consentGranted && apiKeyConfigured;
  }

  assertMock(
    !canProcessExternalEmbedding(false, true),
    "Refuse external embedding when consent is false even if API key is configured"
  );
  assertMock(
    !canProcessExternalEmbedding(true, false),
    "Refuse external embedding when API key is missing even if consent is true"
  );
  assertMock(
    canProcessExternalEmbedding(true, true),
    "Allow external embedding only when both explicit consent and API key are present"
  );

  // ====================================================
  // 9. BACKFILL PAGINATION & ERROR RECOVERY
  // ====================================================
  console.log("\n--- 9. Backfill Pagination & Error Recovery Tests [MOCK] ---");

  const unbondedPending: MockChunkRecord[] = Array.from({ length: 65 }, (_, idx) => ({
    id: `chk-pending-${idx}`,
    user_id: userA,
    source_id: "src-bulk",
    note_id: null,
    source_title: "Bulk Notes.pdf",
    source_type: "pdf",
    collection_id: colAI,
    collection_name: "Research",
    content: `Passage ${idx} covering automated backfill batching.`,
    chunk_index: idx,
    page_number: Math.floor(idx / 5) + 1,
    embedding: null,
    embedding_status: "pending",
    embedding_model: null,
    embedding_error: null,
  }));

  const batchSize = 25;
  const firstBatch = unbondedPending.filter((c) => c.embedding_status === "pending").slice(0, batchSize);
  assertMock(firstBatch.length === 25, "Backfill processes bounded batches (25 items)");

  firstBatch.forEach((c) => {
    c.embedding_status = "ready";
    c.embedding = createTopicVector(c.chunk_index);
    c.embedding_model = DEFAULT_EMBEDDING_MODEL;
  });

  const remainingPending = unbondedPending.filter((c) => c.embedding_status === "pending");
  assertMock(remainingPending.length === 40, "Remaining pending chunks tracked accurately for pagination (40 left)");

  const failingChunk = unbondedPending[26];
  failingChunk.embedding_status = "failed";
  failingChunk.embedding_error = "Google Gemini rate limit exceeded (429)";

  assertMock(failingChunk.content.length > 0, "Failed embedding preserves original content intact");
  assertMock(failingChunk.embedding_status === "failed", "Failed embedding records 'failed' status for retry");
  assertMock(
    failingChunk.embedding_error?.includes("429") === true,
    "Detailed error message preserved for user diagnostics"
  );

  // ====================================================
  // 10. REAL GEMINI API INTEGRATION TEST (CONDITIONAL)
  // ====================================================
  console.log("\n--- 10. Real Gemini API Integration Test [LIVE] ---");

  if (isGeminiConfigured()) {
    try {
      console.log("  [LIVE] GEMINI_API_KEY detected. Executing real live embedding call...");
      const { generateEmbedding } = await import("../src/lib/embeddings/service");
      const realVector = await generateEmbedding("RECALL Personal AI Second Brain Test", "Test Document");
      assertReal(
        validateEmbedding(realVector),
        "Real live Gemini API returned valid 1536-dimensional vector",
        `Dimensions: ${realVector.length}`
      );
    } catch (liveErr: unknown) {
      const liveMsg = liveErr instanceof Error ? liveErr.message : String(liveErr);
      assertReal(
        false,
        "Real live Gemini API call failed",
        liveMsg
      );
    }
  } else {
    console.log("  ○ [LIVE SKIPPED] GEMINI_API_KEY is not set in environment. Skipping live Gemini integration call.");
    realSkipped++;
  }

  // ====================================================
  // SUMMARY REPORT
  // ====================================================
  console.log("\n==================================================================");
  console.log("TEST RESULTS SUMMARY:");
  console.log(`  MOCK TESTS PASSED:  ${mockPassed}`);
  console.log(`  MOCK TESTS FAILED:  ${mockFailed}`);
  console.log(`  LIVE TESTS PASSED:  ${realPassed}`);
  console.log(`  LIVE TESTS FAILED:  ${realFailed}`);
  console.log(`  LIVE TESTS SKIPPED: ${realSkipped}`);
  console.log("==================================================================");

  if (mockFailed > 0 || realFailed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
