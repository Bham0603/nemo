export type SourceKind = "pdf" | "docx" | "txt" | "markdown" | "link" | "note";

export type SourceStatus = "ready" | "processing" | "failed";

export interface Source {
  id: string;
  title: string;
  kind: SourceKind;
  collection: string;
  sizeLabel: string;
  pages?: number;
  words?: number;
  uploadedAt: string;
  status: SourceStatus;
  excerpt: string;
  tags: string[];
  errorMessage?: string | null;
}

export interface Citation {
  citationId?: string;
  sourceId?: string | null;
  chunkId?: string;
  documentTitle?: string;
  page?: number;
  pageNumber?: number | null;
  snippet?: string;
  excerpt?: string;
  similarityScore?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
  streaming?: boolean;
}

export interface ContextGroup {
  id: string;
  label: string;
  kind: "youtube" | "book" | "website" | "codebase" | "podcast" | "research";
  items: { id: string; label: string }[];
  expanded: boolean;
}

export interface Chat {
  id: string;
  title: string;
  subtitle: string;
  mode: "regular" | "context";
  selectedSourceIds: string[];
  messages: Message[];
  updatedAt: string;
  dbConversationId?: string | null;
}

export interface Note {
  id: string;
  date: string;
  title: string;
  body: string;
  tags: string[];
}

/* ------------------------------------------------------------------ *
 *  Semantic search
 * ------------------------------------------------------------------ */

export type SearchMode = "semantic" | "keyword";
export type SearchSort = "relevance" | "recent" | "title";

export interface SearchResult {
  id: string;
  sourceId: string;
  title?: string;
  excerpt: string;
  /** 0..1 — cosine similarity score or lexical score. */
  relevance: number;
  page?: number;
  collection: string;
  kind: SourceKind;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  at: string;
  resultCount: number;
}

/* ------------------------------------------------------------------ *
 *  Connections — concept graph
 * ------------------------------------------------------------------ */

export type ConceptKind = "concept" | "document" | "note";

export interface ConceptNode {
  id: string;
  label: string;
  kind: ConceptKind;
  summary: string;
  x: number;
  y: number;
  /** ids of sources this concept is grounded in */
  sourceIds: string[];
  relatedNoteIds?: string[];
}

export interface ConceptEdge {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  strength: number;
}

/* ------------------------------------------------------------------ *
 *  AI memory
 * ------------------------------------------------------------------ */

export type MemoryCategory =
  | "preference"
  | "interest"
  | "project"
  | "fact"
  | "goal"
  | "custom";

export type MemoryApproval = "approved" | "pending" | "rejected";

export interface MemoryItem {
  id: string;
  label: string;
  value: string;
  category: MemoryCategory;
  approval: MemoryApproval;
  enabled: boolean;
  createdAt: string;
  sourceLabel?: string;
}

/* ------------------------------------------------------------------ *
 *  Settings
 * ------------------------------------------------------------------ */

export type ThemePreference = "dark" | "light" | "system";

export interface UserProfile {
  displayName: string;
  email: string;
  role: string;
  initials: string;
}

export interface AiPreferences {
  defaultModel: string;
  responseLength: "concise" | "balanced" | "detailed";
  alwaysCite: boolean;
  showConfidence: boolean;
  contextChunks: number;
  temperature: number;
}

export interface MemoryPreferences {
  memoryEnabled: boolean;
  requireApproval: boolean;
  autoExpireDays: number;
}

export interface PrivacyPreferences {
  analytics: boolean;
  trainingOptOut: boolean;
}

/* ------------------------------------------------------------------ *
 *  Integrations
 * ------------------------------------------------------------------ */

export type IntegrationStatus = "connected" | "disconnected" | "coming_soon";

export interface EmailIntegration {
  status: IntegrationStatus;
  account: string;
  permissions: { label: string; granted: boolean; detail: string }[];
  lastSync: string;
}

export interface ResearchSource {
  id: string;
  title: string;
  domain: string;
  snippet: string;
  kind: "paper" | "article" | "report";
}

export interface ResearchRun {
  id: string;
  topic: string;
  at: string;
  status: "complete" | "running";
  summary: string;
  sources: ResearchSource[];
  saved: boolean;
}

export interface MeetingParticipant {
  id: string;
  name: string;
  role: string;
}

export interface MeetingPrep {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: MeetingParticipant[];
  notes: string;
  suggestedSourceIds: string[];
  status: "draft" | "ready";
}

/* ------------------------------------------------------------------ *
 *  Navigation
 * ------------------------------------------------------------------ */

export type ViewId =
  | "chats"
  | "library"
  | "search"
  | "connections"
  | "notes"
  | "memory"
  | "settings"
  | "email"
  | "research"
  | "meeting";
