import type { Transport } from "./transport.js";
import { addParams } from "./transport.js";
import type { RequestOptions } from "./client.js";
import type {
  MemoryListResponse,
  MemoryGetResponse,
  MemoryActionResponse,
} from "./types.js";

// ── Parameter types ──────────────────────────────────────────────────────────

export interface MemoryListParams {
  /** Instances per page (1-100, default 20). */
  limit?: number;
  /** Pagination cursor from previous response. */
  cursor?: string;
}

export interface MemoryGetParams {
  /** The context memory ID (resolved chat/session ID). */
  chat_id: string;
  /** Messages per page (1-100, default 20). */
  limit?: number;
  /** Pagination cursor from previous response. */
  cursor?: string;
}

export interface MemorySummarizeParams {
  /** The context memory ID. */
  context_memory_id: string;
  /** The workflow version ID. */
  workflow_version_id: string;
  /** Number of recent messages to keep; rest are summarized. */
  keep_last_n?: number;
  /** Custom summarization prompt (falls back to agent config default). */
  summarize_prompt?: string;
}

export interface MemoryTrimParams {
  /** The context memory ID. */
  context_memory_id: string;
  /** The workflow version ID. */
  workflow_version_id: string;
  /** Maximum messages to keep (default 10). */
  max_messages?: number;
}

export interface MemoryClearParams {
  /** The context memory ID. */
  context_memory_id: string;
  /** The workflow version ID. */
  workflow_version_id: string;
}

export interface MemoryExportParams {
  /** The context memory ID. */
  context_memory_id: string;
  /** The workflow version ID. */
  workflow_version_id: string;
}

export interface MemoryDeleteParams {
  /** The agent/memory node ID. */
  memory_node_id: string;
  /** The workflow version ID. */
  workflow_version_id: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class MemoryService {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /** List memory instances for a workflow version (paginated). */
  async list(
    workflowVersionId: string,
    params?: MemoryListParams,
    options?: RequestOptions,
  ): Promise<MemoryListResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams(`/chat-memories/${workflowVersionId}`, {
        limit: params?.limit,
        cursor: params?.cursor,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get paginated memory messages for an agent node. */
  async get(
    agentNodeId: string,
    params: MemoryGetParams,
    options?: RequestOptions,
  ): Promise<MemoryGetResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams(`/chat-memory/${agentNodeId}`, {
        chat_id: params.chat_id,
        limit: params.limit,
        cursor: params.cursor,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Summarize memory, replacing older messages with an LLM-generated summary. */
  async summarize(
    agentNodeId: string,
    params: MemorySummarizeParams,
    options?: RequestOptions,
  ): Promise<MemoryActionResponse> {
    return this.transport.request({
      method: "POST",
      path: `/chat-memory/${agentNodeId}/actions`,
      body: {
        action: "summarize",
        context_memory_id: params.context_memory_id,
        workflow_version_id: params.workflow_version_id,
        keep_last_n: params.keep_last_n,
        summarize_prompt: params.summarize_prompt,
      },
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Trim memory to a maximum number of messages (drop oldest). */
  async trim(
    agentNodeId: string,
    params: MemoryTrimParams,
    options?: RequestOptions,
  ): Promise<MemoryActionResponse> {
    return this.transport.request({
      method: "POST",
      path: `/chat-memory/${agentNodeId}/actions`,
      body: {
        action: "trim",
        context_memory_id: params.context_memory_id,
        workflow_version_id: params.workflow_version_id,
        max_messages: params.max_messages,
      },
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Clear all memory messages for a memory instance. */
  async clear(
    agentNodeId: string,
    params: MemoryClearParams,
    options?: RequestOptions,
  ): Promise<MemoryActionResponse> {
    return this.transport.request({
      method: "POST",
      path: `/chat-memory/${agentNodeId}/actions`,
      body: {
        action: "clear",
        context_memory_id: params.context_memory_id,
        workflow_version_id: params.workflow_version_id,
      },
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Export all memory messages for a memory instance. */
  async export(
    agentNodeId: string,
    params: MemoryExportParams,
    options?: RequestOptions,
  ): Promise<MemoryActionResponse> {
    return this.transport.request({
      method: "POST",
      path: `/chat-memory/${agentNodeId}/actions`,
      body: {
        action: "export",
        context_memory_id: params.context_memory_id,
        workflow_version_id: params.workflow_version_id,
      },
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Delete all memory for a specific memory instance. */
  async delete(
    contextMemoryId: string,
    params: MemoryDeleteParams,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/chat-memories/${contextMemoryId}`,
      body: {
        memory_node_id: params.memory_node_id,
        workflow_version_id: params.workflow_version_id,
      },
      signal: options?.signal,
      headers: options?.headers,
    });
  }
}
