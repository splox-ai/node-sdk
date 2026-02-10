import type { Transport } from "./transport.js";
import type { RequestOptions } from "./client.js";
import type { EventResponse } from "./types.js";

// ── Parameter types ──────────────────────────────────────────────────────────

export interface SendEventParams {
  webhookId: string;
  payload?: Record<string, unknown>;
  /** Optional webhook secret, sent as `X-Webhook-Secret` header. */
  secret?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class EventService {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /** Trigger a workflow via webhook. No API key is required. */
  async send(params: SendEventParams, options?: RequestOptions): Promise<EventResponse> {
    const headers: Record<string, string> = {
      ...options?.headers,
    };
    if (params.secret) {
      headers["X-Webhook-Secret"] = params.secret;
    }

    return this.transport.request({
      method: "POST",
      path: `/events/${params.webhookId}`,
      body: params.payload ?? {},
      headers,
      signal: options?.signal,
    });
  }
}
