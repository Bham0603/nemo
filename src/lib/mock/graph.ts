import type {
  ConceptEdge,
  ConceptNode,
  SearchHistoryEntry,
} from "../types";

/**
 * Concept graph. Positions are hand-placed on a 900x520 canvas so the layout
 * is stable across renders — no force simulation, no graph dependency.
 */
export const conceptNodes: ConceptNode[] = [
  {
    id: "n_transformer",
    label: "Transformer Architecture",
    kind: "concept",
    summary:
      "The sequence model that replaced recurrence with self-attention. Computes pairwise relations across all token representations in parallel.",
    x: 450,
    y: 96,
    sourceIds: ["src_transformer_arch"],
  },
  {
    id: "n_self_attention",
    label: "Self Attention",
    kind: "concept",
    summary:
      "Each token weighs every other token directly. Solves long-range dependencies and eliminates bottleneck recurrent hidden states.",
    x: 250,
    y: 208,
    sourceIds: ["src_transformer_arch", "src_deep_learning"],
  },
  {
    id: "n_embeddings",
    label: "Embeddings",
    kind: "concept",
    summary:
      "Meaning mapped into continuous high-dimensional vector space. Retrieval quality depends on embedding geometry before indexing.",
    x: 650,
    y: 208,
    sourceIds: ["src_vector_db", "src_deep_learning"],
  },
  {
    id: "n_deep_learning",
    label: "Deep Learning",
    kind: "concept",
    summary:
      "Foundational framework: stacked representation layers, backpropagation, and loss optimization. Attention is a routing architecture within it.",
    x: 128,
    y: 330,
    sourceIds: ["src_deep_learning", "src_ml_notes"],
  },
  {
    id: "n_rag",
    label: "RAG Architecture",
    kind: "concept",
    summary:
      "Retrieve first, then generate. Grounds parametric language models with verifiable passages from external non-parametric vector indices.",
    x: 470,
    y: 330,
    sourceIds: ["src_rag_research", "src_codebase_notes"],
  },
  {
    id: "n_chunking",
    label: "Chunking Strategy",
    kind: "concept",
    summary:
      "Chunk size determines the unit of meaning returned to the reader. Structural segmentation outperforms naive fixed-window token slicing.",
    x: 742,
    y: 330,
    sourceIds: ["src_codebase_notes", "src_rag_research"],
  },
  {
    id: "n_hybrid",
    label: "Hybrid Retrieval",
    kind: "concept",
    summary:
      "Dense vector search for conceptual nuance combined with sparse lexical search (BM25) for exact identifiers and entity matches.",
    x: 610,
    y: 440,
    sourceIds: ["src_hybrid_search", "src_vector_db"],
  },
  {
    id: "n_citations",
    label: "Passage Citations",
    kind: "concept",
    summary:
      "Grounding mechanism ensuring every claim links directly to its source passage and page number, eliminating unsubstantiated hallucination.",
    x: 330,
    y: 440,
    sourceIds: ["src_rag_research"],
  },
  {
    id: "n_pgvector",
    label: "pgvector / HNSW",
    kind: "document",
    summary:
      "Approximate nearest neighbor index trade-offs. Exact scans suffice for small corpuses; HNSW graphs scale to millions of high-dimensional vectors.",
    x: 812,
    y: 168,
    sourceIds: ["src_vector_db", "src_pgvector_docs"],
  },
  {
    id: "n_ai_agents",
    label: "AI Agents",
    kind: "note",
    summary:
      "Autonomous systems combining LLMs with persistent working memory, planning loops (ReAct), and structured tool execution.",
    x: 96,
    y: 452,
    sourceIds: ["src_ai_agents", "src_ml_notes"],
  },
];

export const conceptEdges: ConceptEdge[] = [
  {
    id: "e1",
    fromId: "n_transformer",
    toId: "n_self_attention",
    label: "built on",
    strength: 0.95,
  },
  {
    id: "e2",
    fromId: "n_transformer",
    toId: "n_embeddings",
    label: "produces",
    strength: 0.9,
  },
  {
    id: "e3",
    fromId: "n_self_attention",
    toId: "n_deep_learning",
    label: "special case of",
    strength: 0.72,
  },
  {
    id: "e4",
    fromId: "n_embeddings",
    toId: "n_rag",
    label: "enables",
    strength: 0.88,
  },
  {
    id: "e5",
    fromId: "n_rag",
    toId: "n_chunking",
    label: "requires",
    strength: 0.83,
  },
  {
    id: "e6",
    fromId: "n_chunking",
    toId: "n_hybrid",
    label: "constrains",
    strength: 0.7,
  },
  {
    id: "e7",
    fromId: "n_rag",
    toId: "n_citations",
    label: "must produce",
    strength: 0.92,
  },
  {
    id: "e8",
    fromId: "n_embeddings",
    toId: "n_pgvector",
    label: "stored in",
    strength: 0.78,
  },
  {
    id: "e9",
    fromId: "n_hybrid",
    toId: "n_citations",
    label: "improves",
    strength: 0.64,
  },
  {
    id: "e10",
    fromId: "n_deep_learning",
    toId: "n_ai_agents",
    label: "powers",
    strength: 0.75,
  },
  {
    id: "e11",
    fromId: "n_self_attention",
    toId: "n_rag",
    label: "powers",
    strength: 0.66,
  },
  {
    id: "e12",
    fromId: "n_rag",
    toId: "n_ai_agents",
    label: "grounds",
    strength: 0.82,
  },
];

export const searchHistory: SearchHistoryEntry[] = [
  {
    id: "sh1",
    query: "self-attention scaling in Transformer Architecture",
    at: "2026-11-01T09:12:00",
    resultCount: 5,
  },
  {
    id: "sh2",
    query: "hybrid retrieval with vector databases and BM25",
    at: "2026-10-31T18:40:00",
    resultCount: 4,
  },
  {
    id: "sh3",
    query: "chunk size and citation accuracy",
    at: "2026-10-31T11:05:00",
    resultCount: 5,
  },
  {
    id: "sh4",
    query: "dense vs sparse retrieval tradeoffs",
    at: "2026-10-30T16:22:00",
    resultCount: 4,
  },
  {
    id: "sh5",
    query: "AI agent planning and tool execution patterns",
    at: "2026-10-29T08:31:00",
    resultCount: 3,
  },
];

export const suggestedSearches = [
  "How does self-attention work in Transformers?",
  "Hybrid retrieval with dense embeddings and BM25",
  "What did I conclude about chunking?",
  "Where does hybrid retrieval break down?",
  "Vector database indexing tradeoffs: HNSW vs exact scan",
];
