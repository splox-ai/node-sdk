import { StreamError } from "./errors.js";
import type { SSEEvent, NodeExecution, WorkflowRequest } from "./types.js";

/**
 * Async iterator over Server-Sent Events.
 *
 * ```ts
 * const stream = await client.workflows.listen("req_123");
 *
 * for await (const event of stream) {
 *   if (event.workflow_request) {
 *     console.log("Status:", event.workflow_request.status);
 *   }
 * }
 * ```
 */
export class SSEStream implements AsyncIterable<SSEEvent> {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private readonly decoder = new TextDecoder();
  private buffer = "";
  private _closed = false;

  constructor(response: Response) {
    if (!response.body) {
      throw new StreamError("Response body is null");
    }
    this.reader = response.body.getReader();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<SSEEvent> {
    try {
      while (!this._closed) {
        const { done, value } = await this.reader.read();

        if (done) break;

        this.buffer += this.decoder.decode(value, { stream: true });

        const lines = this.buffer.split("\n");
        // Keep the last partial line in the buffer
        this.buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const line = raw.trim();
          if (line === "" || line.startsWith(":")) continue;
          if (!line.startsWith("data:")) continue;

          const payload = line.slice(5).trim();

          if (payload === "keepalive") {
            yield { isKeepalive: true, rawData: payload };
            continue;
          }

          try {
            const parsed = JSON.parse(payload) as {
              workflow_request?: WorkflowRequest;
              node_execution?: NodeExecution;
            };
            yield {
              workflow_request: parsed.workflow_request,
              node_execution: parsed.node_execution,
              isKeepalive: false,
              rawData: payload,
            };
          } catch {
            // JSON parse failed — yield raw event
            yield { isKeepalive: false, rawData: payload };
          }
        }
      }
    } catch (err) {
      if (this._closed) return;
      throw new StreamError(
        "SSE stream read failed",
        err instanceof Error ? err : undefined,
      );
    }
  }

  /** Close the SSE stream and release resources. */
  close(): void {
    this._closed = true;
    this.reader.cancel().catch(() => {
      // ignore cancel errors
    });
  }
}
