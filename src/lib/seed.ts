import type { Chat, ContextGroup } from "./types";

export { sources, collections } from "./mock/sources";
export {
  conceptNodes,
  conceptEdges,
  searchHistory,
  suggestedSearches,
} from "./mock/graph";
export {
  notes,
  memoryItems,
  userProfile,
  aiPreferences,
  memoryPreferences,
  privacyPreferences,
  modelOptions,
  emailIntegration,
  researchRuns,
  meetingPreps,
} from "./mock/workspace";

export const contextGroups: ContextGroup[] = [
  {
    id: "grp_book",
    label: "Core Knowledge & Papers",
    kind: "book",
    expanded: true,
    items: [
      { id: "src_transformer_arch", label: "Transformer Architecture.pdf" },
      { id: "src_deep_learning", label: "Deep Learning Notes.pdf" },
      { id: "src_rag_research", label: "RAG Research.pdf" },
      { id: "src_vector_db", label: "Vector Database Research.md" },
      { id: "src_ai_agents", label: "AI Agents Documentation.pdf" },
      { id: "src_ml_notes", label: "Machine Learning Notes.md" },
    ],
  },
  {
    id: "grp_research",
    label: "Smart research",
    kind: "research",
    expanded: false,
    items: [
      { id: "src_rag_research", label: "RAG Research" },
      { id: "src_hybrid_search", label: "Hybrid Search" },
    ],
  },
  {
    id: "grp_website",
    label: "Documentation & Links",
    kind: "website",
    expanded: false,
    items: [{ id: "src_pgvector_docs", label: "pgvector — operating notes" }],
  },
  {
    id: "grp_codebase",
    label: "Chat with codebase",
    kind: "codebase",
    expanded: false,
    items: [{ id: "src_codebase_notes", label: "recall-app" }],
  },
  {
    id: "grp_youtube",
    label: "Chat with YouTube video",
    kind: "youtube",
    expanded: false,
    items: [
      {
        id: "src_youtube_transformers",
        label: "Attention Mechanisms in Transformers",
      },
    ],
  },
  {
    id: "grp_podcast",
    label: "Chat with podcast",
    kind: "podcast",
    expanded: false,
    items: [
      {
        id: "src_podcast_retrieval",
        label: "Neural search vs keyword indexing",
      },
    ],
  },
];

export const chats: Chat[] = [
  {
    id: "chat_transformer_arch",
    title: "Transformer Architecture & Self-Attention",
    subtitle:
      "Detailed examination of multi-head attention and representation learning",
    mode: "context",
    selectedSourceIds: ["src_transformer_arch", "src_deep_learning"],
    updatedAt: "2026-11-01T13:31:00",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "How does the Transformer model replace recurrence with self-attention?",
        createdAt: "2026-11-01T13:30:00",
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "**Self-attention** eliminates sequential recurrence by computing direct pairwise relationships between every token position in parallel. Rather than passing hidden states forward step by step, the model computes query, key, and value vectors for all tokens simultaneously.\n\n**Multi-Head Attention** extends this mechanism by projecting queries, keys, and values into multiple representation subspaces, allowing the model to jointly attend to syntactic, positional, and semantic information at different positions.",
        createdAt: "2026-11-01T13:31:00",
        citations: [
          {
            sourceId: "src_transformer_arch",
            page: 4,
            snippet:
              "The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.",
          },
          {
            sourceId: "src_deep_learning",
            page: 18,
            snippet:
              "Multi-layer feedforward and attention-based networks map raw feature vectors into dense semantic manifolds with residual skip connections.",
          },
        ],
      },
      {
        id: "m3",
        role: "assistant",
        content:
          "**Key architectural sub-components:**\n\n1. **Scaled Dot-Product Attention:** Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V. The scaling factor sqrt(d_k) counteracts large dot products pushing softmax into regions with vanishing gradients.\n2. **Residual Connections & LayerNorm:** Each sub-layer utilizes Add & Norm wrappers (LayerNorm(x + Sublayer(x))) to stabilize gradient backpropagation across deep stacks.\n3. **Positional Encoding:** Because self-attention contains no inherent recurrence or convolutions, fixed or learned sinusoidal positional encodings are injected into input embeddings to preserve sequence order.",
        createdAt: "2026-11-01T13:31:20",
      },
    ],
  },
  {
    id: "chat_rag_architecture",
    title: "RAG architecture review",
    subtitle: "Chunking strategy, retrieval quality, and citation fidelity",
    mode: "context",
    selectedSourceIds: [
      "src_rag_research",
      "src_vector_db",
      "src_pgvector_docs",
    ],
    updatedAt: "2026-10-31T18:12:00",
    messages: [
      {
        id: "r1",
        role: "user",
        content: "Where does my chunking strategy actually break down?",
        createdAt: "2026-10-31T18:10:00",
      },
      {
        id: "r2",
        role: "assistant",
        content:
          "Fixed-size chunking breaks in three places, and you have all three.\n\n**1. Tables and figures.** An 800-token window cuts a table in half, so the retrieval hit contains headers without rows. Citations then point at a page that does not answer the question.\n\n**2. Cross-reference prose.** Text like \"as shown in section 4\" retrieves cleanly but carries no meaning without its referent.\n\n**3. Dense identifiers.** Error codes, statute numbers, and part numbers are exactly where embeddings are weakest — which is why you want sparse retrieval fused alongside.\n\nThe fix is structural chunking on headings first, then size, with a parent-document pointer so a retrieved child can expand to its section.",
        createdAt: "2026-10-31T18:12:00",
        citations: [
          {
            sourceId: "src_rag_research",
            page: 7,
            snippet:
              "Retrieval-Augmented Generation pairs pre-trained parametric language models with dense vector indices, grounding generative outputs and providing verifiable passage-level citations.",
          },
          {
            sourceId: "src_vector_db",
            snippet:
              "Approximate Nearest Neighbor (ANN) search using HNSW and IVF-PQ graph indices trades indexing memory overhead for sub-millisecond similarity recall across high-dimensional embeddings.",
          },
        ],
      },
    ],
  },
  {
    id: "chat_ai_agents",
    title: "AI Agents & Tool Execution",
    subtitle: "Working through autonomous agent loops and planning strategies",
    mode: "regular",
    selectedSourceIds: [],
    updatedAt: "2026-10-30T09:40:00",
    messages: [
      {
        id: "a1",
        role: "user",
        content: "Summarise the core components of an autonomous AI agent.",
        createdAt: "2026-10-30T09:38:00",
      },
      {
        id: "a2",
        role: "assistant",
        content:
          "An autonomous agent extends an LLM core with four key subsystems:\n\n1. **Planning & Decomposition:** Breaks complex goals into manageable sub-tasks using patterns like ReAct, Chain-of-Thought, or Plan-and-Solve.\n2. **Memory Architecture:** Short-term memory tracks current turn context, while long-term memory leverages vector search for persistent fact retrieval across sessions.\n3. **Tool Calling & Execution:** Interfaces with external APIs, compilers, and databases via structured JSON schema definitions.\n4. **Self-Reflection & Verification:** Critiques execution output against target criteria and retries or adjusts the plan upon observing runtime errors.",
        createdAt: "2026-10-30T09:40:00",
        citations: [
          {
            sourceId: "src_ai_agents",
            page: 3,
            snippet:
              "Autonomous AI agents integrate language models with memory systems, planning capabilities, and structured tool calling to execute multi-step reasoning workflows.",
          },
          {
            sourceId: "src_ml_notes",
            snippet:
              "Foundational principles of supervised and self-supervised learning, loss function optimization, regularization techniques, and evaluation metrics.",
          },
        ],
      },
    ],
  },
];
