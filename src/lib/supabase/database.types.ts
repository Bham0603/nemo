export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          email: string;
          avatar_url: string | null;
          role: string;
          gemini_embedding_consent: boolean;
          gemini_consent_updated_at: string | null;
          gemini_chat_consent: boolean;
          gemini_chat_consent_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          email: string;
          avatar_url?: string | null;
          role?: string;
          gemini_embedding_consent?: boolean;
          gemini_consent_updated_at?: string | null;
          gemini_chat_consent?: boolean;
          gemini_chat_consent_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          email?: string;
          avatar_url?: string | null;
          role?: string;
          gemini_embedding_consent?: boolean;
          gemini_consent_updated_at?: string | null;
          gemini_chat_consent?: boolean;
          gemini_chat_consent_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          id: string;
          user_id: string;
          collection_id: string | null;
          title: string;
          file_name: string | null;
          file_type: string | null;
          mime_type: string | null;
          file_size: number | null;
          storage_path: string | null;
          external_url: string | null;
          processing_status: "ready" | "processing" | "failed";
          page_count: number | null;
          word_count: number | null;
          error_message: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          collection_id?: string | null;
          title: string;
          file_name?: string | null;
          file_type?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          storage_path?: string | null;
          external_url?: string | null;
          processing_status?: "ready" | "processing" | "failed";
          page_count?: number | null;
          word_count?: number | null;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          collection_id?: string | null;
          title?: string;
          file_name?: string | null;
          file_type?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          storage_path?: string | null;
          external_url?: string | null;
          processing_status?: "ready" | "processing" | "failed";
          page_count?: number | null;
          word_count?: number | null;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          note_date: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content?: string;
          note_date?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          note_date?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          conversation_mode: "regular" | "context";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          conversation_mode?: "regular" | "context";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          conversation_mode?: "regular" | "context";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          citations: Json;
          model: string | null;
          generation_status: string | null;
          retrieval_metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          citations?: Json;
          model?: string | null;
          generation_status?: string | null;
          retrieval_metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          citations?: Json;
          model?: string | null;
          generation_status?: string | null;
          retrieval_metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          category: "fact" | "preference" | "topic" | "decision" | "system";
          approval_status: "approved" | "pending" | "rejected";
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          category?: "fact" | "preference" | "topic" | "decision" | "system";
          approval_status?: "approved" | "pending" | "rejected";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          category?: "fact" | "preference" | "topic" | "decision" | "system";
          approval_status?: "approved" | "pending" | "rejected";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      concept_nodes: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          description: string | null;
          node_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          description?: string | null;
          node_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          description?: string | null;
          node_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      concept_edges: {
        Row: {
          id: string;
          user_id: string;
          source_node_id: string;
          target_node_id: string;
          relationship_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_node_id: string;
          target_node_id: string;
          relationship_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_node_id?: string;
          target_node_id?: string;
          relationship_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      research_runs: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          summary: string | null;
          sources: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          summary?: string | null;
          sources?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          query?: string;
          summary?: string | null;
          sources?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      meeting_preps: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          meeting_date: string | null;
          participants: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          meeting_date?: string | null;
          participants?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          meeting_date?: string | null;
          participants?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          appearance: "dark" | "light" | "system";
          density: "comfortable" | "compact";
          ai_preferences: Json;
          memory_preferences: Json;
          privacy_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          appearance?: "dark" | "light" | "system";
          density?: "comfortable" | "compact";
          ai_preferences?: Json;
          memory_preferences?: Json;
          privacy_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          appearance?: "dark" | "light" | "system";
          density?: "comfortable" | "compact";
          ai_preferences?: Json;
          memory_preferences?: Json;
          privacy_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      knowledge_chunks: {
        Row: {
          id: string;
          user_id: string;
          source_id: string | null;
          note_id: string | null;
          chunk_index: number;
          content: string;
          page_number: number | null;
          metadata: Json;
          embedding: string | null;
          embedding_model: string | null;
          embedding_status: "pending" | "processing" | "ready" | "failed";
          embedding_error: string | null;
          embedded_at: string | null;
          content_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_id?: string | null;
          note_id?: string | null;
          chunk_index: number;
          content: string;
          page_number?: number | null;
          metadata?: Json;
          embedding?: string | null;
          embedding_model?: string | null;
          embedding_status?: "pending" | "processing" | "ready" | "failed";
          embedding_error?: string | null;
          embedded_at?: string | null;
          content_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_id?: string | null;
          note_id?: string | null;
          chunk_index?: number;
          content?: string;
          page_number?: number | null;
          metadata?: Json;
          embedding?: string | null;
          embedding_model?: string | null;
          embedding_status?: "pending" | "processing" | "ready" | "failed";
          embedding_error?: string | null;
          embedded_at?: string | null;
          content_hash?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_knowledge_chunks: {
        Args: {
          query_embedding: string;
          match_count?: number;
          match_threshold?: number;
          filter_collection_id?: string | null;
          filter_source_id?: string | null;
        };
        Returns: {
          chunk_id: string;
          source_id: string | null;
          note_id: string | null;
          content: string;
          chunk_index: number;
          page_number: number | null;
          source_title: string | null;
          source_type: string | null;
          collection_id: string | null;
          collection_name: string | null;
          note_title: string | null;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
