import type { Transport } from "./transport.js";
import { addParams } from "./transport.js";
import { SSEStream } from "./sse.js";
import type { RequestOptions } from "./client.js";
import type {
  Chat,
  ChatListResponse,
  ChatHistoryResponse,
} from "./types.js";

// ── Parameter types ──────────────────────────────────────────────────────────

export interface CreateChatParams {
  name: string;
  resource_id: string;
  resource_type?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatHistoryParams {
  limit?: number;
  /** RFC 3339 timestamp for backward pagination. */
  before?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class ChatService {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /** Create a new chat session. */
  async create(params: CreateChatParams, options?: RequestOptions): Promise<Chat> {
    return this.transport.request({
      method: "POST",
      path: "/chats",
      body: {
        ...params,
        resource_type: params.resource_type ?? "api",
      },
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get a chat session by ID. */
  async get(chatId: string, options?: RequestOptions): Promise<Chat> {
    return this.transport.request({
      method: "GET",
      path: `/chats/${chatId}`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** List all chats for a given resource. */
  async listForResource(
    resourceType: string,
    resourceId: string,
    options?: RequestOptions,
  ): Promise<ChatListResponse> {
    return this.transport.request({
      method: "GET",
      path: `/chats/${resourceType}/${resourceId}`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Open an SSE stream for real-time chat events. */
  async listen(chatId: string, options?: RequestOptions): Promise<SSEStream> {
    const response = await this.transport.stream(
      `/chat-internal-messages/${chatId}/listen`,
      options?.signal,
    );
    return new SSEStream(response);
  }

  /** Get paginated chat message history. */
  async getHistory(
    chatId: string,
    params?: ChatHistoryParams,
    options?: RequestOptions,
  ): Promise<ChatHistoryResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams(`/chat-history/${chatId}/paginated`, {
        limit: params?.limit,
        before: params?.before,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Delete all message history for a chat. */
  async deleteHistory(chatId: string, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/chat-history/${chatId}`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Delete a chat session. */
  async delete(chatId: string, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/chats/${chatId}`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }
}
