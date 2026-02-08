import { Transport } from "./transport.js";
import { WorkflowService } from "./workflows.js";
import { ChatService } from "./chats.js";
import { EventService } from "./events.js";

const DEFAULT_BASE_URL = "https://app.splox.io/api/v1";

/**
 * Configuration options for the Splox client.
 */
export interface SploxOptions {
  /** Override the default API base URL. */
  baseURL?: string;
  /**
   * Custom `fetch` implementation.
   * Defaults to the global `fetch`. Useful for testing or custom HTTP agents.
   */
  fetch?: typeof fetch;
}

/**
 * Per-request options that can be passed to any API method.
 */
export interface RequestOptions {
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
  /** Extra headers to merge into the request. */
  headers?: Record<string, string>;
}

/**
 * Splox API client.
 *
 * ```ts
 * import Splox from "splox";
 *
 * const client = new Splox("your-api-key");
 *
 * const { workflows } = await client.workflows.list();
 * ```
 *
 * If `apiKey` is omitted, the `SPLOX_API_KEY` environment variable is used.
 */
export class Splox {
  readonly workflows: WorkflowService;
  readonly chats: ChatService;
  readonly events: EventService;

  constructor(apiKey?: string, options?: SploxOptions) {
    const key = apiKey ?? (typeof process !== "undefined" ? process.env.SPLOX_API_KEY : undefined) ?? "";
    const baseURL = options?.baseURL ?? DEFAULT_BASE_URL;
    const fetchFn = options?.fetch ?? globalThis.fetch;

    if (!fetchFn) {
      throw new Error(
        "No fetch implementation found. Use Node.js >= 18 or provide a custom fetch via options.fetch.",
      );
    }

    const transport = new Transport(baseURL, key, fetchFn);

    this.workflows = new WorkflowService(transport);
    this.chats = new ChatService(transport);
    this.events = new EventService(transport);
  }
}
