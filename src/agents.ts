import type { Transport } from "./transport.js";
import type { RequestOptions } from "./client.js";
import type { AgentGatherResponse, AgentSpawnResponse } from "./types.js";

export interface SpawnAgentOptions {
  /** Target agent tool name. */
  agentName: string;
  /** Optional conversation ID for the child run. */
  conversationId?: string;
  /** Optional label for the child agent run. */
  label?: string;
}

export interface GatherAgentsOptions {
  /** Optional total timeout in seconds. Omit to wait indefinitely until terminal. */
  timeout?: number;
  /** Backwards-compatible alias for timeout. */
  timeoutSeconds?: number;
  /** Optional client-side pause after fast polls, in seconds. Defaults to 2. */
  pollInterval?: number;
}

export class AgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentError";
  }
}

export class AgentResult {
  readonly run_id: string;
  readonly status: string;
  readonly result?: string;
  readonly error?: string;

  constructor(data: { run_id: string; status: string; result?: string | null; error?: string | null }) {
    this.run_id = data.run_id;
    this.status = data.status === "in_progress" ? "running" : data.status;
    if (data.result != null) this.result = data.result;
    if (data.error != null) this.error = data.error;
  }
}

export class AgentRun {
  readonly run_id: string;

  /** @internal */
  constructor(private readonly agents: AgentService, runID: string) {
    this.run_id = runID;
  }

  /** Non-blocking snapshot for this run. */
  async poll(options?: RequestOptions): Promise<AgentResult> {
    const results = await this.agents.gather([this], { timeout: 0, pollInterval: 0 }, options, 0);
    return results[0] ?? new AgentResult({ run_id: this.run_id, status: "pending" });
  }

  /** Block until terminal; return final text or throw AgentError/TimeoutError. */
  async result(timeout?: number, options?: RequestOptions): Promise<string> {
    const results = await this.agents.gather([this], { timeout }, options);
    const current = results[0] ?? new AgentResult({ run_id: this.run_id, status: "pending" });
    if (current.status === "completed") return current.result ?? "";
    if (current.status === "failed" || current.status === "stopped") {
      throw new AgentError(current.error ?? current.status);
    }
    throw timeoutError(`agent run ${this.run_id} did not finish before timeout`);
  }
}

function getParentRunID(): string {
  const parentRunID = typeof process !== "undefined" ? process.env.SPLOX_RUN_ID : undefined;
  if (!parentRunID) {
    throw new Error(
      "SPLOX_RUN_ID environment variable is required to spawn an agent. " +
        "Run this inside a Splox workflow sandbox or set SPLOX_RUN_ID to the parent run id.",
    );
  }
  return parentRunID;
}

function runID(run: AgentRun | string): string {
  return typeof run === "string" ? run : run.run_id;
}

function orderResults(runIds: string[], items: Array<{ run_id: string; status: string; result?: string | null; error?: string | null }>): AgentResult[] {
  const byID = new Map(items.map((item) => [item.run_id, new AgentResult(item)]));
  return runIds.map((id) => byID.get(id) ?? new AgentResult({ run_id: id, status: "pending" }));
}

function timeoutError(message: string): Error {
  const err = new Error(message);
  err.name = "TimeoutError";
  return err;
}

export class AgentService {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  /** Spawn a child agent run and return an AgentRun handle. */
  async spawn(
    message: string,
    params?: SpawnAgentOptions,
    options?: RequestOptions,
  ): Promise<AgentRun> {
    if (!params?.agentName) {
      throw new Error("agentName is required");
    }
    const resp = await this.transport.request<AgentSpawnResponse>({
      method: "POST",
      path: "/agents/spawn",
      body: {
        parent_run_id: getParentRunID(),
        message,
        agent_name: params.agentName,
        ...(params.conversationId !== undefined ? { conversation_id: params.conversationId } : {}),
        ...(params.label !== undefined ? { label: params.label } : {}),
      },
      signal: options?.signal,
      headers: options?.headers,
    });
    return new AgentRun(this, resp.run_id);
  }

  /** Gather child agent results by polling bounded server waits. Never raises for agent failures. */
  async gather(
    runs: Array<AgentRun | string>,
    params?: GatherAgentsOptions,
    options?: RequestOptions,
    waitSecondsOverride = 5,
  ): Promise<AgentResult[]> {
    const runIds = runs.map(runID);
    if (runIds.length === 0) return [];
    const started = Date.now();
    const timeoutValue = params?.timeout ?? params?.timeoutSeconds;
    const timeoutMs = timeoutValue !== undefined ? timeoutValue * 1000 : undefined;
    const pollIntervalMs = (params?.pollInterval ?? 2) * 1000;
    let results = runIds.map((id) => new AgentResult({ run_id: id, status: "pending" }));

    while (true) {
      const requestStarted = Date.now();
      const elapsed = Date.now() - started;
      const remainingMs = timeoutMs === undefined ? undefined : Math.max(0, timeoutMs - elapsed);
      let waitSeconds = Math.min(25, Math.max(0, waitSecondsOverride));
      if (remainingMs !== undefined) waitSeconds = Math.min(waitSeconds, remainingMs / 1000);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(5_000, (waitSeconds + 10) * 1000));
      const onAbort = () => controller.abort();
      if (options?.signal) {
        if (options.signal.aborted) controller.abort();
        else options.signal.addEventListener("abort", onAbort, { once: true });
      }
      try {
        const resp = await this.transport.request<AgentGatherResponse>({
          method: "POST",
          path: "/agents/gather",
          body: { run_ids: runIds, wait_seconds: waitSeconds },
          signal: controller.signal,
          headers: options?.headers,
        });
        results = orderResults(runIds, resp.results ?? []);
        if (resp.all_terminal) return results;
        if (timeoutMs !== undefined && Date.now() - started >= timeoutMs) return results;
      } finally {
        clearTimeout(timer);
        if (options?.signal) options.signal.removeEventListener("abort", onAbort);
      }

      const elapsedRequest = Date.now() - requestStarted;
      if (pollIntervalMs > 0 && elapsedRequest < pollIntervalMs) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs - elapsedRequest));
      }
    }
  }
}
