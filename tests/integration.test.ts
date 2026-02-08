import { describe, it, expect, beforeAll } from "vitest";
import { Splox } from "../src/client.js";
import type { Chat } from "../src/types.js";

/**
 * Integration tests against the live Splox API.
 *
 * Requires SPLOX_API_KEY environment variable.
 * Run with: pnpm test:integration
 */

const apiKey = process.env.SPLOX_API_KEY;

describe.skipIf(!apiKey)("Integration tests", () => {
  let client: Splox;
  let workflowId: string;
  let workflowVersionId: string;
  let startNodeId: string;
  let chat: Chat;

  beforeAll(() => {
    client = new Splox(apiKey!);
  });

  // ── Workflows ────────────────────────────────────────────────────────────

  it("1. lists workflows", async () => {
    const result = await client.workflows.list({ limit: 5 });
    expect(result.workflows).toBeDefined();
    expect(Array.isArray(result.workflows)).toBe(true);
    expect(result.workflows.length).toBeGreaterThan(0);
    workflowId = result.workflows[0].id;
    console.log(`  → found ${result.workflows.length} workflows, using ${workflowId}`);
  });

  it("2. gets a workflow", async () => {
    const result = await client.workflows.get(workflowId);
    expect(result.workflow.id).toBe(workflowId);
    expect(result.workflow_version).toBeDefined();
    console.log(`  → workflow version: ${result.workflow_version.name}`);
  });

  it("3. gets latest version", async () => {
    const version = await client.workflows.getLatestVersion(workflowId);
    expect(version.workflow_id).toBe(workflowId);
    workflowVersionId = version.id;
    console.log(`  → latest version: ${version.id} (v${version.version_number})`);
  });

  it("4. lists versions", async () => {
    const result = await client.workflows.listVersions(workflowId);
    expect(result.versions.length).toBeGreaterThan(0);
    console.log(`  → ${result.versions.length} versions`);
  });

  it("5. gets start nodes", async () => {
    const result = await client.workflows.getStartNodes(workflowVersionId);
    expect(result.nodes.length).toBeGreaterThan(0);
    startNodeId = result.nodes[0].id;
    console.log(`  → start node: ${startNodeId} (${result.nodes[0].label})`);
  });

  // ── Chat ─────────────────────────────────────────────────────────────────

  it("6. creates a chat", async () => {
    chat = await client.chats.create({
      name: "node-sdk integration test",
      resource_id: workflowVersionId,
    });
    expect(chat.id).toBeDefined();
    expect(chat.name).toBe("node-sdk integration test");
    console.log(`  → chat: ${chat.id}`);
  });

  it("7. gets a chat", async () => {
    const result = await client.chats.get(chat.id);
    expect(result.id).toBe(chat.id);
  });

  it("8. lists chats for resource", async () => {
    const result = await client.chats.listForResource("api", workflowVersionId);
    expect(result.chats.length).toBeGreaterThan(0);
    console.log(`  → ${result.chats.length} chats`);
  });

  // ── Run workflow ─────────────────────────────────────────────────────────

  it("9. runs a workflow and listens via SSE", async () => {
    const { workflow_request_id } = await client.workflows.run({
      workflow_version_id: workflowVersionId,
      chat_id: chat.id,
      start_node_id: startNodeId,
      query: "Hello from node-sdk integration test",
    });
    expect(workflow_request_id).toBeDefined();
    console.log(`  → workflow request: ${workflow_request_id}`);

    // Listen to a few SSE events
    const stream = await client.workflows.listen(workflow_request_id);
    const events = [];
    for await (const event of stream) {
      events.push(event);
      if (event.workflow_request?.status === "completed" ||
          event.workflow_request?.status === "failed" ||
          events.length >= 20) {
        stream.close();
        break;
      }
    }

    expect(events.length).toBeGreaterThan(0);
    console.log(`  → received ${events.length} SSE events`);
  }, 60_000);

  it("10. gets execution tree", async () => {
    // Get a recent workflow request from history
    const history = await client.workflows.getHistory(workflowVersionId, { limit: 1 });
    if (history.data.length > 0) {
      const tree = await client.workflows.getExecutionTree(history.data[0].id);
      expect(tree.execution_tree).toBeDefined();
      console.log(`  → execution tree status: ${tree.execution_tree.status}`);
    }
  });

  it("11. gets workflow history", async () => {
    const result = await client.workflows.getHistory(workflowVersionId, { limit: 5 });
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    console.log(`  → ${result.data.length} history entries`);
  });

  // ── Chat history ─────────────────────────────────────────────────────────

  it("12. gets chat history", async () => {
    const result = await client.chats.getHistory(chat.id, { limit: 10 });
    expect(result.messages).toBeDefined();
    console.log(`  → ${result.messages.length} messages, has_more: ${result.has_more}`);
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────

  it("13. deletes chat history", async () => {
    await client.chats.deleteHistory(chat.id);
    console.log("  → chat history deleted");
  });

  it("14. deletes chat", async () => {
    await client.chats.delete(chat.id);
    console.log("  → chat deleted");
  });
});
