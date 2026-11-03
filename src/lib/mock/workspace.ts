import type {
  AiPreferences,
  EmailIntegration,
  MeetingPrep,
  MemoryItem,
  MemoryPreferences,
  Note,
  PrivacyPreferences,
  ResearchRun,
  UserProfile,
} from "../types";

/* ------------------------------------------------------------------ *
 *  Daily notes
 * ------------------------------------------------------------------ */

export const notes: Note[] = [
  {
    id: "note_2026_11_01",
    date: "2026-11-01",
    title: "Chunking is a product decision",
    body: "Chunk size chooses what unit of meaning the user is allowed to be answered with. That is not a config value, it is a product decision wearing a config value's clothes.\n\nIf I chunk at 800 tokens I am telling the user: your answer arrives in paragraphs. If I chunk at section level I am telling them: your answer arrives in arguments.\n\nThe second is harder to build and much better to use.",
    tags: ["rag", "product", "chunking"],
  },
  {
    id: "note_2026_10_31",
    date: "2026-10-31",
    title: "Citations must be passage-level",
    body: "A citation that does not support the sentence above it transfers trust without transferring evidence. That is worse than no citation, because it looks like rigour.\n\nRule: every claim gets the passage, not the document. Page number is the minimum. Quote is better.",
    tags: ["citations", "trust", "rag"],
  },
  {
    id: "note_2026_10_29",
    date: "2026-10-29",
    title: "Dense vs sparse retrieval trade-offs",
    body: "Dense retrieval captures paraphrase and conceptual intent, but fails on rare entities, model numbers, and error codes. Sparse retrieval (BM25) preserves exact identifier matching.\n\nReciprocal Rank Fusion (RRF) provides a robust combination without the calibration instability of score blending.",
    tags: ["retrieval", "hybrid-search", "bm25"],
  },
  {
    id: "note_2026_10_25",
    date: "2026-10-25",
    title: "pgvector operating notes",
    body: "Under a few hundred thousand chunks, exact scan is simpler and fast enough. HNSW is a premature optimisation at small scale and it costs recall that cannot be easily measured.\n\nRevisit HNSW indexing at 500k chunks, not before.",
    tags: ["infra", "postgres", "vector"],
  },
  {
    id: "note_2026_10_22",
    date: "2026-10-22",
    title: "Attention mechanisms & context scaling",
    body: "Self-attention compute scales quadratically with sequence length O(N²). FlashAttention and rotary positional embeddings (RoPE) address hardware execution efficiency, but context compression remains key for long-horizon recall.\n\nRetaining high token fidelity across multi-turn reasoning is essential for deep retrieval.",
    tags: ["transformers", "attention", "deep-learning"],
  },
];

/* ------------------------------------------------------------------ *
 *  AI memory
 * ------------------------------------------------------------------ */

export const memoryItems: MemoryItem[] = [
  {
    id: "mem_1",
    label: "Name and role",
    value: "Alex Chen — AI research engineer working on neural search and retrieval architectures.",
    category: "preference",
    approval: "approved",
    enabled: true,
    createdAt: "2026-10-02",
    sourceLabel: "Profile",
  },
  {
    id: "mem_2",
    label: "Answer style",
    value: "Prefers direct technical answers with reasoning and citations shown, no preamble.",
    category: "preference",
    approval: "approved",
    enabled: true,
    createdAt: "2026-10-04",
    sourceLabel: "Stated in chat",
  },
  {
    id: "mem_3",
    label: "Active project",
    value:
      "RAG pipeline: hybrid search, structural chunking, passage-level citations.",
    category: "project",
    approval: "approved",
    enabled: true,
    createdAt: "2026-10-09",
    sourceLabel: "Architecture notes",
  },
  {
    id: "mem_4",
    label: "Reading list",
    value: "Transformer architectures, vector database indexing, neural retrieval.",
    category: "interest",
    approval: "approved",
    enabled: true,
    createdAt: "2026-10-14",
    sourceLabel: "Library activity",
  },
  {
    id: "mem_5",
    label: "Dislikes",
    value: "Generic chatbot tone. Summaries that restate the question without technical depth.",
    category: "preference",
    approval: "approved",
    enabled: false,
    createdAt: "2026-10-16",
    sourceLabel: "Stated in chat",
  },
  {
    id: "mem_6",
    label: "Learning goal",
    value:
      "Master approximate nearest neighbor indexing internals (HNSW and DiskANN) for large-scale embeddings.",
    category: "goal",
    approval: "approved",
    enabled: true,
    createdAt: "2026-10-21",
    sourceLabel: "Daily note",
  },
  {
    id: "mem_7",
    label: "Working hours",
    value: "Most productive during deep focus blocks between 14:00 and 19:00.",
    category: "fact",
    approval: "pending",
    enabled: false,
    createdAt: "2026-10-27",
    sourceLabel: "Inferred from activity",
  },
  {
    id: "mem_8",
    label: "Preferred stack",
    value: "Next.js App Router, TypeScript, Tailwind, Python, PyTorch, pgvector.",
    category: "project",
    approval: "approved",
    enabled: true,
    createdAt: "2026-10-11",
    sourceLabel: "Architecture notes",
  },
  {
    id: "mem_9",
    label: "Writing voice",
    value:
      "Short sentences. Concrete architectural nouns. Precise technical definitions without fluff.",
    category: "custom",
    approval: "pending",
    enabled: false,
    createdAt: "2026-10-30",
    sourceLabel: "Inferred from notes",
  },
  {
    id: "mem_10",
    label: "Research notes",
    value: "Benchmarking IVF-PQ quantization versus full-precision vector indexing on 1M vectors.",
    category: "interest",
    approval: "rejected",
    enabled: false,
    createdAt: "2026-10-23",
    sourceLabel: "Inferred from notes",
  },
];

/* ------------------------------------------------------------------ *
 *  Settings
 * ------------------------------------------------------------------ */

export const userProfile: UserProfile = {
  displayName: "Alex Chen",
  email: "alex.chen@recall.app",
  role: "AI Research Engineer",
  initials: "AC",
};

export const aiPreferences: AiPreferences = {
  defaultModel: "Recall Balanced",
  responseLength: "balanced",
  alwaysCite: true,
  showConfidence: true,
  contextChunks: 8,
  temperature: 0.3,
};

export const memoryPreferences: MemoryPreferences = {
  memoryEnabled: true,
  requireApproval: true,
  autoExpireDays: 90,
};

export const privacyPreferences: PrivacyPreferences = {
  analytics: false,
  trainingOptOut: true,
};

export const modelOptions = [
  { id: "recall-fast", label: "Recall Fast", detail: "Lowest latency, short answers" },
  { id: "recall-balanced", label: "Recall Balanced", detail: "Default for most work" },
  { id: "recall-deep", label: "Recall Deep", detail: "Slower, longer reasoning chains" },
  { id: "byo-endpoint", label: "Bring your own", detail: "Custom Gemini-compatible endpoint" },
];

/* ------------------------------------------------------------------ *
 *  Integrations
 * ------------------------------------------------------------------ */

export const emailIntegration: EmailIntegration = {
  status: "disconnected",
  account: "",
  lastSync: "",
  permissions: [
    {
      label: "Read message subjects and senders",
      granted: false,
      detail: "Used to surface threads you may want to save as sources.",
    },
    {
      label: "Read message bodies",
      granted: false,
      detail: "Required before an email can be summarised or cited.",
    },
    {
      label: "Send on your behalf",
      granted: false,
      detail: "Only ever used when you explicitly ask Recall to send.",
    },
  ],
};

export const researchRuns: ResearchRun[] = [
  {
    id: "res_1",
    topic: "Does hybrid retrieval beat dense-only at small corpus sizes?",
    at: "2026-10-31T15:20:00",
    status: "complete",
    saved: true,
    summary:
      "Three of four sources agree that fusion helps most on mixed workloads containing identifiers. Below roughly 50k chunks the gain is small enough that operational simplicity may win.",
    sources: [
      {
        id: "rs1",
        title: "Hybrid Search: Dense and Sparse Retrieval.pdf",
        domain: "local library",
        snippet:
          "Fusing both consistently beats either alone on mixed query workloads.",
        kind: "paper",
      },
      {
        id: "rs2",
        title: "Reciprocal Rank Fusion",
        domain: "research note",
        snippet:
          "Rank fusion avoids the calibration problem that score blending introduces.",
        kind: "paper",
      },
      {
        id: "rs3",
        title: "BM25 still wins on identifiers",
        domain: "engineering notes",
        snippet:
          "Error codes and part numbers remain a sparse-retrieval problem.",
        kind: "article",
      },
    ],
  },
  {
    id: "res_2",
    topic: "Evaluating multi-agent coordination architectures and tool calling",
    at: "2026-10-28T10:05:00",
    status: "complete",
    saved: false,
    summary:
      "Comparative analysis of reactive versus deliberative agent architectures. Hierarchical decomposition with structured tool definitions reduces error propagation in multi-step planning tasks.",
    sources: [
      {
        id: "rs4",
        title: "AI Agents Documentation.pdf",
        domain: "local library",
        snippet:
          "Autonomous AI agents integrate language models with memory systems and structured tool calling.",
        kind: "report",
      },
      {
        id: "rs5",
        title: "Machine Learning Notes.md",
        domain: "local library",
        snippet:
          "Foundational principles of supervised and self-supervised learning for generalized predictive models.",
        kind: "paper",
      },
    ],
  },
];

export const meetingPreps: MeetingPrep[] = [
  {
    id: "mtg_1",
    title: "RAG pipeline review with engineering",
    date: "2026-11-03",
    time: "14:00",
    status: "ready",
    participants: [
      { id: "p1", name: "Alex Chen", role: "AI Research Engineer" },
      { id: "p2", name: "Dana Whitfield", role: "Backend engineer" },
      { id: "p3", name: "Marcus Ali", role: "ML engineer" },
    ],
    notes:
      "Open with the citation fidelity problem, not the index choice. Engineering will want to talk HNSW; that is the second conversation.\n\nDecision needed: do we ship exact scan to 500k chunks and revisit, or build the HNSW path now?",
    suggestedSourceIds: [
      "src_hybrid_search",
      "src_pgvector_docs",
      "src_codebase_notes",
      "src_rag_research",
    ],
  },
  {
    id: "mtg_2",
    title: "Transformer Architecture & Retrieval Scaling",
    date: "2026-11-05",
    time: "10:30",
    status: "draft",
    participants: [
      { id: "p1", name: "Alex Chen", role: "AI Research Engineer" },
      { id: "p4", name: "Dr. Sarah Lin", role: "Lead AI Scientist" },
    ],
    notes:
      "Evaluate multi-head attention optimizations and vector index latency benchmarks. Discuss chunk overlap strategies for technical documentation.",
    suggestedSourceIds: ["src_transformer_arch", "src_deep_learning", "src_vector_db"],
  },
];
