import type { Source } from "../types";

/**
 * Static demonstration library. Grounded in RECALL AI and Machine Learning
 * knowledge representations — nothing here is uploaded, parsed, or indexed.
 */
export const sources: Source[] = [
  {
    id: "src_transformer_arch",
    title: "Transformer Architecture.pdf",
    kind: "pdf",
    collection: "Research",
    sizeLabel: "3.4 MB",
    pages: 15,
    uploadedAt: "2026-10-28",
    status: "ready",
    excerpt:
      "The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.",
    tags: ["transformer", "attention", "neural-networks", "deep-learning"],
  },
  {
    id: "src_deep_learning",
    title: "Deep Learning Notes.pdf",
    kind: "pdf",
    collection: "Research",
    sizeLabel: "5.1 MB",
    pages: 42,
    uploadedAt: "2026-10-29",
    status: "ready",
    excerpt:
      "Hierarchical representation learning across deep neural networks. Residual connections and layer normalization prevent vanishing gradients during multi-layer backpropagation.",
    tags: ["deep-learning", "backprop", "representations", "optimization"],
  },
  {
    id: "src_rag_research",
    title: "RAG Research.pdf",
    kind: "pdf",
    collection: "Research",
    sizeLabel: "2.8 MB",
    pages: 19,
    uploadedAt: "2026-10-30",
    status: "ready",
    excerpt:
      "Retrieval-Augmented Generation (RAG) pairs pre-trained parametric language models with dense vector indices, grounding generative outputs and providing verifiable passage-level citations.",
    tags: ["rag", "retrieval", "nlp", "citations"],
  },
  {
    id: "src_vector_db",
    title: "Vector Database Research.md",
    kind: "markdown",
    collection: "Engineering",
    sizeLabel: "48 KB",
    words: 3850,
    uploadedAt: "2026-10-31",
    status: "ready",
    excerpt:
      "Approximate Nearest Neighbor (ANN) search using HNSW and IVF-PQ graph indices trades indexing memory overhead for sub-millisecond similarity recall across high-dimensional embeddings.",
    tags: ["vector-database", "hnsw", "embeddings", "similarity-search"],
  },
  {
    id: "src_ai_agents",
    title: "AI Agents Documentation.pdf",
    kind: "pdf",
    collection: "Engineering",
    sizeLabel: "4.6 MB",
    pages: 28,
    uploadedAt: "2026-11-01",
    status: "ready",
    excerpt:
      "Autonomous AI agents integrate language models with memory systems, planning capabilities, and structured tool calling to execute multi-step reasoning workflows.",
    tags: ["ai-agents", "planning", "tool-use", "autonomous-systems"],
  },
  {
    id: "src_ml_notes",
    title: "Machine Learning Notes.md",
    kind: "markdown",
    collection: "Research",
    sizeLabel: "32 KB",
    words: 4120,
    uploadedAt: "2026-10-26",
    status: "ready",
    excerpt:
      "Foundational principles of supervised and self-supervised learning, loss function optimization, regularization techniques, and evaluation metrics for generalized predictive models.",
    tags: ["machine-learning", "supervised-learning", "optimization", "evaluation"],
  },
  {
    id: "src_hybrid_search",
    title: "Hybrid Search: Dense and Sparse Retrieval.pdf",
    kind: "pdf",
    collection: "Research",
    sizeLabel: "1.4 MB",
    pages: 12,
    uploadedAt: "2026-10-27",
    status: "ready",
    excerpt:
      "Dense retrieval captures paraphrase and intent; sparse retrieval captures exact identifiers. Fusing both consistently beats either alone on mixed query workloads.",
    tags: ["search", "embeddings", "bm25", "hybrid"],
  },
  {
    id: "src_pgvector_docs",
    title: "pgvector — operating notes",
    kind: "link",
    collection: "Engineering",
    sizeLabel: "link",
    uploadedAt: "2026-10-25",
    status: "ready",
    excerpt:
      "HNSW indexes trade build time and memory for recall. For under a few hundred thousand chunks, an exact scan is often fast enough and far simpler to reason about.",
    tags: ["postgres", "vector", "infra"],
  },
  {
    id: "src_youtube_transformers",
    title: "Attention Mechanisms in Transformers — talk transcript",
    kind: "txt",
    collection: "Research",
    sizeLabel: "48 KB",
    words: 7300,
    uploadedAt: "2026-10-27",
    status: "ready",
    excerpt:
      "Self-attention computes dynamic weights between token representations. Multi-head projections allow the network to attend to syntactic and semantic relations simultaneously.",
    tags: ["transformer", "attention", "lecture", "video"],
  },
  {
    id: "src_podcast_retrieval",
    title: "Podcast: Neural Search vs Keyword Indexing",
    kind: "txt",
    collection: "Research",
    sizeLabel: "1h 12m",
    uploadedAt: "2026-10-29",
    status: "ready",
    excerpt:
      "Neural embeddings understand synonyms and intent, but lexical indexes like BM25 remain unbeatable for acronyms, part numbers, and verbatim entity matching.",
    tags: ["podcast", "neural-search", "bm25"],
  },
  {
    id: "src_codebase_notes",
    title: "recall-app — architecture notes",
    kind: "markdown",
    collection: "Engineering",
    sizeLabel: "24 KB",
    words: 2900,
    uploadedAt: "2026-10-31",
    status: "ready",
    excerpt:
      "Next.js app router, vector database indexing, chunking at ~800 tokens with 15% overlap, embeddings batched at 96 per request.",
    tags: ["architecture", "next.js", "vector-db"],
  },
  {
    id: "src_agent_workflow",
    title: "Agentic Workflow Specification.docx",
    kind: "docx",
    collection: "Engineering",
    sizeLabel: "310 KB",
    pages: 8,
    uploadedAt: "2026-10-18",
    status: "ready",
    excerpt:
      "Specification for multi-turn agent execution loops: plan decomposition, tool validation, context retrieval, and structured JSON output verification.",
    tags: ["agents", "specification", "tool-use"],
  },
  {
    id: "src_embedding_benchmarks",
    title: "Embedding Model Benchmarks.txt",
    kind: "txt",
    collection: "Engineering",
    sizeLabel: "18 KB",
    words: 2100,
    uploadedAt: "2026-10-24",
    status: "ready",
    excerpt:
      "MTEB evaluation results comparing 768-dim vs 1536-dim embedding models for retrieval accuracy, latency, and vector memory footprint.",
    tags: ["benchmarks", "embeddings", "mteb"],
  },
  {
    id: "src_failed_import",
    title: "Unstructured Paper Scan.pdf",
    kind: "pdf",
    collection: "Research",
    sizeLabel: "31 MB",
    pages: 64,
    uploadedAt: "2026-10-20",
    status: "failed",
    excerpt:
      "Scanned pages with no extractable text layer. This record is here to demonstrate the failed-indexing state.",
    tags: ["scan", "ocr"],
  },
  {
    id: "src_active_index",
    title: "Context Windows & FlashAttention.md",
    kind: "markdown",
    collection: "Research",
    sizeLabel: "16 KB",
    words: 1650,
    uploadedAt: "2026-11-01",
    status: "processing",
    excerpt:
      "IO-aware exact attention computation and GPU memory hierarchy optimizations for scaling context windows without memory degradation.",
    tags: ["flash-attention", "cuda", "memory"],
  },
];

export const collections = [
  "Research",
  "Engineering",
] as const;
