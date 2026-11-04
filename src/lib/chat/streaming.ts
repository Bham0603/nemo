/**
 * SSE Streaming Helpers for RECALL Step 7.
 * Provides utilities for encoding Server-Sent Events in Next.js Route Handlers.
 */

import type { StreamEvent } from "./types";

/**
 * Encodes a StreamEvent as an SSE data line.
 * Format: `data: <json>\n\n`
 */
export function encodeEvent(event: StreamEvent): Uint8Array {
  const json = JSON.stringify(event);
  return new TextEncoder().encode(`data: ${json}\n\n`);
}

/**
 * Creates an SSE Response from an async generator of StreamEvents.
 * Uses a ReadableStream with a TransformStream to encode events.
 * Compatible with Next.js 16 App Router Route Handlers.
 */
export function createSSEResponse(
  source: (controller: ReadableStreamDefaultController) => Promise<void>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await source(controller);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Stream error";
        const errorEvent: StreamEvent = { type: "error", data: { message: msg } };
        try {
          controller.enqueue(encodeEvent(errorEvent));
        } catch {
          // Controller may already be closed
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

