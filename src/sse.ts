import { StreamError } from "./errors.js";
import type { SSEEvent, NodeExecution, WorkflowRequest } from "./types.js";

/** Raw SSE event payload shape. */
interface RawSSEPayload {
  workflow_request?: WorkflowRequest;
  node_execution?: NodeExecution;
  node_exec?: NodeExecution;
  type?: string;
  iteration?: number;
  run_id?: string;
  delta?: string;
  reasoning_delta?: string;
  reasoning_type?: string;
  tool_call_id?: string;
  tool_name?: string;
  tool_args_delta?: string;
  args?: unknown;
  result?: unknown;
  approved?: boolean;
  text?: string;
  message?: string;
  error?: string;
}

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
            const parsed = JSON.parse(payload) as RawSSEPayload;
            yield {
              workflow_request: parsed.workflow_request,
              node_execution: parsed.node_execution ?? parsed.node_exec,
              isKeepalive: false,
              rawData: payload,
              // Chat streaming fields
              eventType: parsed.type,
              iteration: parsed.iteration,
              runId: parsed.run_id,
              textDelta: parsed.delta,
              reasoningDelta: parsed.reasoning_delta,
              reasoningType: parsed.reasoning_type,
              toolCallId: parsed.tool_call_id,
              toolName: parsed.tool_name,
              toolArgsDelta: parsed.tool_args_delta,
              toolArgs: parsed.args,
              toolResult: parsed.result,
              approved: parsed.approved,
              text: parsed.text,
              message: parsed.message,
              error: parsed.error,
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
