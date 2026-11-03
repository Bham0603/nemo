/**
 * Gemini Chat Model Abstraction for RECALL (Step 7 Scaffolding).
 * Prepares server-side client access and configuration for future
 * grounded conversational RAG answers without implementing completion pipelines prematurely.
 */

import { getGeminiChatModel, isGeminiConfigured } from "./config";
import { getGeminiClient } from "./client";

export interface GeminiChatConfig {
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Returns chat configuration and readiness for Step 7.
 */
export function getChatServiceStatus(): {
  isConfigured: boolean;
  model: string;
} {
  return {
    isConfigured: isGeminiConfigured(),
    model: getGeminiChatModel(),
  };
}

/**
 * Validates that Gemini client and credentials are available for chat generation.
 * (Chat execution pipeline itself is strictly deferred to Step 7).
 */
export function assertChatReady(): { client: ReturnType<typeof getGeminiClient>; model: string } {
  const client = getGeminiClient();
  const model = getGeminiChatModel();
  return { client, model };
}

