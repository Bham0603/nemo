/**
 * Core type definitions for RECALL - Personal AI Second Brain
 */

export type ID = string;

export type ISODateString = string;

export interface BaseEntity {
  id: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type KnowledgeItemType = "pdf" | "document" | "note" | "link";

export type KnowledgeItemStatus = "processing" | "ready" | "failed";

export interface KnowledgeItem extends BaseEntity {
  title: string;
  type: KnowledgeItemType;
  status: KnowledgeItemStatus;
  summary?: string;
  tags?: string[];
  sourceUrl?: string;
  fileSize?: number;
}

export interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
  external?: boolean;
  badge?: string | number;
}

export type WorkspaceColumnView = "library" | "reader" | "chat";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

