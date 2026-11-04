# RECALL — your personal AI second brain

A personal knowledge workspace: collect sources, connect them, and ask questions that are answered **only** from what you saved, with passage-level citations.

---

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional for local preview)
cp .env.example .env.local

# 3. Run development server
npm run dev      # http://localhost:3000

# 4. Verify code quality & production build
npm run lint
npx tsc --noEmit
npm run build
```

---

## Supabase Backend & Authentication (Step 4)

Step 4 establishes the Supabase PostgreSQL backend, Row Level Security (RLS), private cloud storage, authentication screens, and Next.js 16 server-side session synchronization.

---

## Knowledge Ingestion Engine (Step 5)

Step 5 implements the complete server-side knowledge ingestion pipeline, document parsing, SSRF-safe URL scraping, text normalization, intelligent chunking, and notes synchronization.

### 1. Supported Input Formats

| Format | Parsing Engine | Structural Features Preserved |
|---|---|---|
| **PDF** | `unpdf` | Per-page text extraction, page numbers, metadata, scanned-document detection without OCR |
| **DOCX** | `mammoth` | Paragraph structure, heading hierarchy, clean markdown conversion |
| **TXT** | Native UTF-8 stream | Byte Order Mark (BOM) stripping, newline normalization |
| **Markdown** | Native AST parser | Headings (`#`, `##`), lists, code blocks, semantic hierarchy |
| **Website URLs** | Safe fetch + `cheerio` | Anti-SSRF validation, readable body extraction, script/style/nav stripping |
| **User Notes** | Real-time autosave | Direct knowledge chunk synchronization with versioning |

### 2. Private Storage Architecture

Uploaded documents are stored in the private Supabase Storage bucket `knowledge-files`:

```
knowledge-files/{user_id}/{source_id}/{file_name}
```

- **Folder-Level RLS**: Enforces that users can only upload, read, and delete files inside their own `user_id` folder.
- **Signed URLs**: Document previews and downloads use short-lived signed URLs (1-hour expiry) generated on-demand via `/api/sources/[id]`. No files are ever served via public storage URLs.
- **Rollback Cleanup**: If extraction or database operations fail after a file is uploaded, the storage file is automatically deleted to prevent orphaned storage bloat.
- **File Validation**: Enforces a 25 MB max size limit, sanitizes file paths to prevent directory traversal, and inspects magic byte headers (`%PDF-`, `PK\x03\x04`) rather than trusting user-supplied MIME types.

### 3. Strict Anti-SSRF Protection Engine

Website URL ingestion (`/api/ingest/url`) incorporates enterprise-grade protection against Server-Side Request Forgery (SSRF):

- **Protocol Restriction**: Accepts only `http:` and `https:`.
- **IP Address Blacklisting**: Detects and drops all loopback addresses (`127.0.0.0/8`, `::1`), private networks (RFC 1918 `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, unique-local `fc00::/7`, link-local `fe80::/10`), and carrier-grade NAT (`100.64.0.0/10`).
- **Cloud Metadata Defense**: Explicitly blocks requests targeting cloud metadata services:
  - AWS/GCP/Azure link-local: `169.254.169.254`
  - Google internal metadata: `metadata.google.internal`
  - Alibaba Cloud metadata: `100.100.100.200`
- **Pre-Flight DNS Resolution**: Resolves hostnames before initiating HTTP requests and checks every resolved IPv4/IPv6 address against the blocklist.
- **Safe Redirect Execution**: Manually inspects each redirect hop (up to 5 hops), enforcing anti-SSRF checks on every target URL before fetching.
- **Safety Ceilings**: 10-second request timeout and 10 MB maximum response body limit.

### 4. Intelligent Chunking Strategy

Extracted text is processed by `src/lib/ingest/chunker.ts` into semantic chunks designed for vector retrieval in Step 6:

- **Target Chunk Size**: 450–600 words per chunk.
- **Chunk Overlap**: 70–100 words preserved between consecutive chunks to maintain semantic context across boundaries.
- **Page Awareness**: Multi-page documents track `page_number` for each chunk, preserving exact citations.
- **Ordering**: Strict 0-based sequential indexing (`chunk_index: 0, 1, 2...`) with unique database constraints.
- **Normalization**: Strips surrogate pairs, collapses excessive whitespace, and standardizes line endings.

### 5. Step 5 Database Migration

Migration file: `supabase/migrations/20261103000000_knowledge_chunks.sql`

- **New Table `knowledge_chunks`**:
  - `id` (UUID PK)
  - `user_id` (references `auth.users(id)` ON DELETE CASCADE)
  - `source_id` (references `public.sources(id)` ON DELETE CASCADE, nullable)
  - `note_id` (references `public.notes(id)` ON DELETE CASCADE, nullable)
  - `chunk_index` (integer NOT NULL, >= 0)
  - `content` (text NOT NULL)
  - `page_number` (integer nullable)
  - `word_count` (integer NOT NULL)
  - `token_count` (integer NOT NULL)
  - `metadata` (JSONB)
  - `created_at` (timestamptz)
- **Integrity Constraints**:
  - `check_chunk_parent`: Ensures a chunk belongs to *either* a `source_id` OR a `note_id` (not both, not neither).
  - Unique composite indexes for ordering: `(source_id, chunk_index)` and `(note_id, chunk_index)`.
- **Row Level Security (RLS)**:
  - Enabled on `knowledge_chunks`.
  - Scoped to `auth.uid() = user_id` for SELECT, INSERT, UPDATE, and DELETE.
- **Source Status Enhancements**:
  - Added `error_message` (text) and `metadata` (JSONB) columns to `sources` to track failure reasons and parser stats.

#### Applying Step 5 Migration:

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Open `supabase/migrations/20261103000000_knowledge_chunks.sql`.
3. Paste the SQL and click **Run**.
4. Verify success: `knowledge_chunks` table created, RLS enabled.

### 6. Automated Step 5 Test Suite

Run the end-to-end ingestion test suite:

```bash
npx tsx scripts/test-step5.ts
```

Runs 50 automated assertions covering:
- IPv4 & IPv6 loopback, private ranges, and cloud metadata SSRF blocking.
- Dangerous protocol blocking (`file://`, `ftp://`, `gopher://`).
- Magic byte detection for PDF, DOCX, TXT, and Markdown.
- Scanned PDF detection (zero extractable text).
- Overlap preservation and page number retention in chunking.

To verify multi-tenant SQL RLS isolation on knowledge chunks:
1. Open the Supabase Dashboard **SQL Editor**.
2. Run `supabase/tests/knowledge_chunks_test.sql`.

---

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and configure your Supabase project keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-publishable-key>
```

> **Note:** The application includes safe build-time environment variable validation. If `.env.local` is not configured, the workspace automatically operates in **Local Guest Mode**, allowing the interface to be previewed and tested without breaking `npm run build`.

### 2. Database Migrations

Database migrations are located in `supabase/migrations/`:

- `20261102000000_initial_schema.sql`:
  - 12 PostgreSQL tables with UUID primary keys, foreign key constraints, cascade rules, and optimized indexes:
    1. `profiles` (linked to `auth.users`)
    2. `collections`
    3. `sources`
    4. `notes`
    5. `conversations`
    6. `messages`
    7. `memories`
    8. `concept_nodes`
    9. `concept_edges`
    10. `research_runs`
    11. `meeting_preps`
    12. `user_preferences`
  - Automated `updated_at` trigger.
  - Automated new user profile creation trigger (`on_auth_user_created`).
  - Row Level Security (RLS) enabled on all 12 tables with explicit policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` strictly scoped to `auth.uid() = user_id`.

- `20261102000001_storage_setup.sql`:
  - Creates the private `knowledge-files` storage bucket.
  - Configures folder-scoped RLS policies: `knowledge-files/<user_id>/<source_id>/<file>`.
  - Ensures users can only upload, read, update, and delete files inside their own user ID folder.

### 3. Applying Migrations

#### Option A: Supabase Dashboard (Recommended if CLI is not local)
1. Open your Supabase Dashboard at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New query**.
3. Copy and run `supabase/migrations/20261102000000_initial_schema.sql`.
4. Copy and run `supabase/migrations/20261102000001_storage_setup.sql`.

#### Option B: Supabase CLI
```bash
supabase link --project-ref <your-project-id>
supabase db push
```

### 4. Running RLS Isolation Tests

A comprehensive SQL test script is provided in `supabase/tests/rls_test.sql`.
To verify tenant isolation (User A cannot access User B's records or files):
1. Open the Supabase Dashboard **SQL Editor**.
2. Paste the contents of `supabase/tests/rls_test.sql` and click **Run**.
3. The script executes simulated transactions under User A and User B roles, asserting that cross-user access fails as expected.

---

## Google Gemini Embeddings & Semantic Search Engine (Step 6)

Step 6 implements the high-dimensional vector embedding and semantic search layer, converting ingested document passages and daily notes into 1536-dimensional vector representations stored in Supabase PostgreSQL via `pgvector`.

### 1. Vector Configuration & Provider Architecture

- **Provider**: Google Gemini via the official `@google/genai` SDK (`GoogleGenAI`).
- **Embedding Model**: `gemini-embedding-2`
- **Output Dimensionality**: 1536 dimensions (strictly enforced via runtime assertions and PostgreSQL column constraints).
- **Future Chat Model Scaffold (Step 7)**: `gemini-3.8-flash`
- **Environment Configuration**:
  ```bash
  GEMINI_API_KEY=your_gemini_api_key
  GEMINI_EMBEDDING_MODEL=gemini-embedding-2
  GEMINI_EMBEDDING_DIMENSIONS=1536
  GEMINI_CHAT_MODEL=gemini-3.8-flash
  ```
- **Security & Privacy Framework**:
  - `GEMINI_API_KEY` is maintained strictly server-side (never exposed in client bundles or public state).
  - **Explicit User Consent**: External embedding generation requires explicit user opt-in (`profiles.gemini_embedding_consent`). Documents and queries are never sent to Gemini without consent.
  - **Transparent Disclosure**: Expandable notice in Search UI detailing data processing, vector dimensionality, and Google AI terms. Users can withdraw consent at any time to pause external vectorization.

### 2. Document & Query Prompt Formatting

- **Document Passages**:
  ```
  title: {document_title} | text: {chunk_content}
  ```
  Applied uniformly across PDF, DOCX, TXT, Markdown, Web, and Daily Notes chunks.
- **Search Retrieval Queries**:
  ```
  task: search result | query: {user_query}
  ```

### 3. Database Migration & Vector Indexing

Migration: `supabase/migrations/20261104000000_vector_embeddings.sql`

- **pgvector Extension**:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
  ```
- **User Privacy & Consent**:
  - `gemini_embedding_consent boolean NOT NULL DEFAULT false` added to `public.profiles`.
  - `gemini_consent_updated_at timestamptz` added to `public.profiles`.
- **Extended `knowledge_chunks` Schema**:
  - `embedding`: `extensions.vector(1536)`
  - `embedding_model`: `TEXT` (`gemini-embedding-2`)
  - `embedding_status`: `TEXT DEFAULT 'pending'` (`pending`, `processing`, `ready`, `failed`)
  - `embedding_error`: `TEXT` (stores diagnostic messages on failure)
  - `embedded_at`: `TIMESTAMPTZ`
  - `content_hash`: `TEXT` (deterministic SHA-256 hash incorporating text, title, and model)
- **HNSW Cosine Vector Index**:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_hnsw
    ON public.knowledge_chunks
    USING hnsw (embedding extensions.vector_cosine_ops)
    WHERE embedding IS NOT NULL;
  ```
- **Secure Semantic Search RPC**:
  `search_knowledge_chunks(query_embedding, match_count, match_threshold, filter_collection_id, filter_source_id)`:
  - `SECURITY INVOKER` strictly respecting Row Level Security.
  - Hard tenant isolation enforced via `kc.user_id = auth.uid()`.
  - Ordered by direct cosine distance (`kc.embedding <=> query_embedding ASC`) to guarantee HNSW index usage.

### 4. API Endpoints

- **`POST /api/search/semantic`**:
  Formats the query as `task: search result | query: ...`, generates a 1536-dimensional query embedding via Gemini, applies similarity thresholding and filters, and queries `search_knowledge_chunks`.
- **`POST /api/embeddings/backfill`**:
  Validates authentication and user consent, batches pending chunks in bounded sets (up to 50 items), computes SHA-256 hashes, generates embeddings with retry backoff, and updates vectors.
- **`GET /api/embeddings/status`**:
  Reports real-time statistics: total chunks, completed embeddings, pending, failed, user consent status, and model metadata.
- **`GET / POST /api/embeddings/consent`**:
  Queries or toggles user opt-in consent for Google Gemini embedding processing.

### 5. Running the Step 6 Test Suite

```bash
npx tsx scripts/test-step6.ts
```
Covers:
- Gemini SDK configuration and model identifiers.
- Strict 1536-dim vector validation (rejects wrong sizes, NaN, Infinity, null).
- Document and query prompt formatting.
- Deterministic SHA-256 content hashing and model cache invalidation.
- Exact cosine distance calculations.
- Multi-tenant tenant boundary isolation (`auth.uid()`).
- Privacy consent verification (blocking unconsented external calls).
- Backfill pagination & error recovery.
- Clearly separated mock tests from live Gemini API integration tests.

---

## Authentication & SSR Architecture

RECALL uses `@supabase/ssr` with cookie-based authentication and adheres to the **Next.js 16 `proxy.ts` convention** (replacing deprecated `middleware.ts`).

- **Next.js 16 Request Proxy**: `src/proxy.ts` delegates to `src/lib/supabase/proxy.ts` (`updateSession`), refreshing expired auth cookies and redirecting unauthenticated requests from protected workspace routes to `/auth/login`.
- **Server Client**: `src/lib/supabase/server.ts` uses async Next.js 16 `cookies()` with `@supabase/ssr`.
- **Browser Client**: `src/lib/supabase/client.ts` manages the singleton browser client.
- **Client Auth Provider**: `src/components/AuthProvider.tsx` wraps the application, listens to Supabase `onAuthStateChange`, synchronizes user profiles with Zustand (`useRecall`), and exposes `signOut()` and `updateProfileData()`.
- **Authentication Screens**:
  - `/auth/login`: Email & password sign-in with "Remember me" and show/hide password toggle.
  - `/auth/signup`: Account registration with display name, password confirmation, and verification banner.
  - `/auth/forgot-password`: Password reset request flow.
  - `/auth/reset-password`: Update password flow handling auth callback tokens.
  - `/auth/callback`: Server route exchanging PKCE auth code for session tokens.
  - `/auth/signout`: Server route clearing session cookies.

---

## Project Structure

```
├── .env.example                     # Environment template
├── supabase/
│   ├── migrations/
│   │   ├── 20261102000000_initial_schema.sql    # 12 tables + RLS + Triggers
│   │   ├── 20261102000001_storage_setup.sql      # Private storage bucket + RLS
│   │   ├── 20261103000000_knowledge_chunks.sql  # Knowledge chunks table + RLS
│   │   └── 20261104000000_vector_embeddings.sql # pgvector + Gemini consent + HNSW index + semantic search RPC
│   └── tests/
│       ├── rls_test.sql             # SQL multi-tenant isolation tests
│       └── knowledge_chunks_test.sql # SQL chunks isolation tests
├── scripts/
│   ├── test-step5.ts                # Ingestion & SSRF test suite (50 assertions)
│   └── test-step6.ts                # Gemini embeddings & vector search test suite (38 mock assertions)
├── src/
│   ├── proxy.ts                     # Next.js 16 request proxy entrypoint
│   ├── app/
│   │   ├── api/
│   │   │   ├── embeddings/
│   │   │   │   ├── status/route.ts  # Embedding counts & model metadata
│   │   │   │   ├── consent/route.ts # User opt-in privacy consent
│   │   │   │   └── backfill/route.ts# Batch vector backfilling with consent check
│   │   │   ├── search/
│   │   │   │   └── semantic/route.ts# Gemini 1536-dim semantic vector search
│   │   │   ├── ingest/
│   │   │   │   ├── upload/route.ts  # File upload & extraction
│   │   │   │   ├── url/route.ts     # Safe website scraping
│   │   │   │   └── retry/route.ts   # Retry failed sources
│   │   │   ├── sources/
│   │   │   │   ├── route.ts         # List user sources
│   │   │   │   └── [id]/route.ts    # Source details, signed URLs, chunks
│   │   │   └── notes/
│   │   │       ├── route.ts         # Sync & chunk user notes
│   │   │       └── [id]/route.ts    # Note deletion
│   │   ├── auth/                    # Dedicated obsidian glass auth views
│   │   ├── layout.tsx               # Root layout with AuthProvider
│   │   └── page.tsx                 # Protected workspace
│   ├── components/
│   │   ├── AuthProvider.tsx         # Auth context & profile synchronization
│   │   ├── LibraryView.tsx          # Real upload, website import, chunk drawer
│   │   ├── NotesView.tsx            # Real-time note sync & chunk extraction
│   │   ├── SearchView.tsx           # Real semantic search with Gemini consent & privacy
│   │   └── Shell.tsx                # Application shell
│   └── lib/
│       ├── gemini/
│       │   ├── config.ts            # Gemini models (gemini-embedding-2, gemini-3.8-flash)
│       │   ├── client.ts            # Reusable server-side GoogleGenAI client singleton
│       │   └── chat.ts              # Step 7 future conversational chat scaffold
│       ├── embeddings/
│       │   ├── config.ts            # Embedding constants (1536 dimensions)
│       │   ├── formatting.ts        # Document & query semantic prompt formatting
│       │   ├── hash.ts              # Deterministic SHA-256 vector hashing
│       │   ├── consent.ts           # User opt-in privacy consent management
│       │   └── service.ts           # Gemini embedding generation & backfill
│       ├── ingest/
│       │   ├── chunker.ts           # Sentence-aware chunking (450-600 words)
│       │   ├── extract.ts           # PDF, DOCX, TXT, MD text extraction
│       │   ├── ssrf.ts              # Anti-SSRF private IP & metadata blocker
│       │   ├── url.ts               # Safe HTTP scraper & Cheerio normalizer
│       │   ├── validation.ts        # Magic byte & file size validation
│       │   └── pipeline.ts          # Unified orchestrator (with Gemini embedding)
│       ├── supabase/
│       └── store.ts                 # Zustand workspace store
```


---

## Gemini-Powered Conversational RAG Chatbot (Step 7)

Step 7 implements the complete conversational AI experience powered by Google Gemini (`gemini-3.8-flash`) and Retrieval-Augmented Generation (RAG). RECALL answers user questions by synthesizing relevant passages from their personal knowledge library with passage-level citations and real-time streaming responses.

### 1. Dual Chat Modes

- **Regular Chat**: General conversational AI mode without document grounding. Gemini answers broad technical and general questions while preserving RECALL's helpful persona.
- **Context Chat (RAG)**: Grounded retrieval mode. The user's query is embedded via `gemini-embedding-2`, matched against their personal knowledge base via pgvector cosine similarity, and assembled into a bounded knowledge context. The answer is generated with strict passage-level citation markers (`[S1]`, `[S2]`).

### 2. End-to-End RAG Pipeline

```
[User Query] 
     │
     ▼
[formatSearchQueryForEmbedding] ──► [Gemini Embedding 2 (1536-dim)]
                                                │
                                                ▼
                                    [search_knowledge_chunks RPC] (pgvector)
                                                │
                                                ▼
[assembleContext] ◄────────────── [Top Ranked Document Chunks]
     │
     ├── Assigns [S1], [S2] IDs
     ├── Enforces 100k Character Budget
     └── Injects Grounding & Anti-Injection Rules
     │
     ▼
[Gemini 3.8 Flash Stream] (generateContentStream)
     │
     ▼
[Server-Sent Events (SSE)] ──► Client Incremental Tokens
     │
     ▼
[parseAndValidateCitations] ──► Hallucination Filter ──► Persist Assistant Turn
```

### 3. Source Citation System & Hallucination Filter

- **Citation Markers**: Answers in Context Chat cite claims with explicit markers (`[S1]`, `[S2]`).
- **Validation**: Generated citations are parsed and cross-referenced against the actual retrieved context chunks. Any hallucinated citation (e.g. `[S99]`) is stripped before persistence.
- **Passage Metadata**: Each validated citation links to the source document, page number, chunk ID, verbatim excerpt, and cosine similarity score.
- **Interactive UI**: Citations appear as clickable chips in the chat thread, revealing document previews and excerpts on hover/click.

### 4. Privacy & Consent Architecture

- **Independent Chat Consent**: Controlled by `profiles.gemini_chat_consent` (independent of `gemini_embedding_consent`). Users must explicitly opt in via **Settings → AI preferences → Enable AI Chat**.
- **Server-Side Enforcement**: Unconsented requests return `403 CHAT_CONSENT_REQUIRED`.
- **Zero API Key Exposure**: All Gemini calls run server-side. The API key is never sent to the browser.
- **Multi-Tenant Isolation**: RLS and explicit server checks ensure users can only retrieve and converse with their own documents.

### 5. Conversation Persistence & Streaming Protocol

- **Persistence**: Conversations and turns are stored in Supabase `conversations` and `messages` tables.
- **Streaming Protocol**: Route Handlers emit Server-Sent Events (`text/event-stream`) with typed JSON payloads:
  - `start`: Emits `conversationId` and `messageId`
  - `token`: Incremental text chunks
  - `citation`: Array of validated citations
  - `done`: Final stream completion
  - `error`: Safe error notifications
- **Rate Limiting**: Enforces a per-user limit of 30 messages per hour to protect API quotas.

### 6. Running the Step 7 Test Suite

```bash
npx tsx scripts/test-step7.ts
```
Covers:
- Gemini Chat configuration & model identification
- Independent chat privacy consent verification
- RAG retrieval, context assembly & citation ID assignment
- Context chat & regular chat system prompt builders + prompt injection protection
- Citation parsing, deduplication & hallucination filtering
- Conversation history loading & role mapping (`assistant` → `model`)
- SSE streaming protocol & event serialization
- Request validation, oversized message protection & multi-tenant isolation
- Live Gemini 3.8 Flash streaming completion (when `GEMINI_API_KEY` is configured)


---

## Design System

- Obsidian canvas (`#08080b`), translucent frosted glass cards, and violet accent (`#8b5cf6`).
- Full responsive support for desktop, tablet, and mobile with animated slide-out navigation.
- Accessible dialogs, keyboard navigation (`Cmd/Ctrl + K`), and clean toast notifications.
