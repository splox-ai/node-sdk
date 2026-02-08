import type { Transport } from "./transport.js";
import { addParams } from "./transport.js";
import { SSEStream } from "./sse.js";
import type { RequestOptions } from "./client.js";
import type {
  WorkflowListResponse,
  WorkflowFullResponse,
  WorkflowVersion,
  WorkflowVersionListResponse,
  StartNodesResponse,
  RunResponse,
  ExecutionTreeResponse,
  HistoryResponse,
  WorkflowRequestFile,
} from "./types.js";
import { TimeoutError } from "./errors.js";

// ── Parameter types ──────────────────────────────────────────────────────────

export interface ListWorkflowsParams {
  limit?: number;
  cursor?: string;
  search?: string;
}

export interface RunWorkflowParams {
  workflow_version_id: string;
  chat_id: string;
  start_node_id: string;
  query: string;
  files?: WorkflowRequestFile[];
  additional_params?: Record<string, unknown>;
}

export interface WorkflowHistoryParams {
  limit?: number;
  cursor?: string;
  search?: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class WorkflowService {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /** List the authenticated user's workflows. */
  async list(params?: ListWorkflowsParams, options?: RequestOptions): Promise<WorkflowListResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams("/workflows", {
        limit: params?.limit,
        cursor: params?.cursor,
        search: params?.search,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get a workflow with its draft version, nodes, and edges. */
  async get(workflowId: string, options?: RequestOptions): Promise<WorkflowFullResponse> {
    return this.transport.request({
      method: "GET",
      path: `/workflows/${workflowId}`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get the latest version of a workflow. */
  async getLatestVersion(workflowId: string, options?: RequestOptions): Promise<WorkflowVersion> {
    return this.transport.request({
      method: "GET",
      path: `/workflows/${workflowId}/versions/latest`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** List all versions of a workflow. */
  async listVersions(workflowId: string, options?: RequestOptions): Promise<WorkflowVersionListResponse> {
    return this.transport.request({
      method: "GET",
      path: `/workflows/${workflowId}/versions`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get start nodes for a workflow version. */
  async getStartNodes(workflowVersionId: string, options?: RequestOptions): Promise<StartNodesResponse> {
    return this.transport.request({
      method: "GET",
      path: `/workflows/${workflowVersionId}/start-nodes`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Trigger a workflow execution. */
  async run(params: RunWorkflowParams, options?: RequestOptions): Promise<RunResponse> {
    return this.transport.request({
      method: "POST",
      path: "/workflow-requests/run",
      body: params,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Open an SSE stream for real-time execution updates. */
  async listen(
    workflowRequestId: string,
    options?: RequestOptions,
  ): Promise<SSEStream> {
    const response = await this.transport.stream(
      `/workflow-requests/${workflowRequestId}/listen`,
      options?.signal,
    );
    return new SSEStream(response);
  }

  /** Get the complete execution tree for a workflow request. */
  async getExecutionTree(
    workflowRequestId: string,
    options?: RequestOptions,
  ): Promise<ExecutionTreeResponse> {
    return this.transport.request({
      method: "GET",
      path: `/workflow-requests/${workflowRequestId}/execution-tree`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get paginated execution history for a workflow request. */
  async getHistory(
    workflowRequestId: string,
    params?: WorkflowHistoryParams,
    options?: RequestOptions,
  ): Promise<HistoryResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams(`/workflow-requests/${workflowRequestId}/history`, {
        limit: params?.limit,
        cursor: params?.cursor,
        search: params?.search,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Stop a running workflow execution. */
  async stop(workflowRequestId: string, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: `/workflow-requests/${workflowRequestId}/stop`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /**
   * Run a workflow and wait for it to reach a terminal state.
   *
   * Returns the full execution tree on completion.
   *
   * @param params - Run parameters
   * @param timeoutMs - Maximum wait time in milliseconds (default: 5 minutes)
   */
  async runAndWait(
    params: RunWorkflowParams,
    timeoutMs = 300_000,
  ): Promise<ExecutionTreeResponse> {
    const { workflow_request_id } = await this.run(params);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const TERMINAL = new Set(["completed", "failed", "stopped"]);

    try {
      const stream = await this.listen(workflow_request_id, { signal: controller.signal });

      try {
        for await (const event of stream) {
          if (
            event.workflow_request &&
            TERMINAL.has(event.workflow_request.status)
          ) {
            return this.getExecutionTree(workflow_request_id);
          }
        }
      } finally {
        stream.close();
      }
    } catch (err) {
      if (controller.signal.aborted) {
        throw new TimeoutError(
          `Workflow did not complete within ${timeoutMs}ms`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    // Stream ended without terminal status — fetch tree anyway
    return this.getExecutionTree(workflow_request_id);
  }
}
