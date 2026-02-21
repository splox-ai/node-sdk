import type { Transport } from "./transport.js";
import type { RequestOptions } from "./client.js";
import type { ChatCompletion } from "./types.js";

export interface ChatParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  [key: string]: unknown;
}

export class LLMService {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /** Send a chat completion request via Splox's OpenAI-compatible endpoint. */
  async chat(params: ChatParams, options?: RequestOptions): Promise<ChatCompletion> {
    return this.transport.request({
      method: "POST",
      path: "/chat/completions",
      body: params,
      signal: options?.signal,
      headers: options?.headers,
    });
  }
}
