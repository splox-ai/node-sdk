# Splox Node.js/TypeScript SDK

[![npm](https://img.shields.io/npm/v/splox)](https://www.npmjs.com/package/splox)
[![CI](https://github.com/splox-ai/node-sdk/actions/workflows/test.yml/badge.svg)](https://github.com/splox-ai/node-sdk/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Official Node.js/TypeScript SDK for the [Splox API](https://docs.splox.io). Zero dependencies — uses the built-in `fetch` and Web Crypto APIs (Node.js ≥ 18).

## Install

```bash
npm install splox
# or
pnpm add splox
```

## Quick Start

```ts
import Splox from "splox";

const client = new Splox("your-api-key");
// Or set SPLOX_API_KEY env var and omit the key:
// const client = new Splox();

const { workflows } = await client.workflows.list();
console.log(workflows);
```

## Workflows

```ts
// List workflows
const { workflows, pagination } = await client.workflows.list({ limit: 10 });

// Get a workflow (with nodes & edges)
const full = await client.workflows.get("workflow_id");

// Get latest version
const version = await client.workflows.getLatestVersion("workflow_id");

// List all versions
const { versions } = await client.workflows.listVersions("workflow_id");

// Get start nodes
const { nodes } = await client.workflows.getStartNodes("version_id");

// Run a workflow
const { workflow_request_id } = await client.workflows.run({
  workflow_version_id: "version_id",
  chat_id: "chat_id",
  start_node_id: "node_id",
  query: "Hello!",
});

// Listen to execution (SSE streaming)
const stream = await client.workflows.listen(workflow_request_id);

for await (const event of stream) {
  if (event.workflow_request) {
    console.log("Status:", event.workflow_request.status);
  }
  if (event.node_execution) {
    console.log("Node:", event.node_execution.node_id, event.node_execution.status);
  }
}

// Get execution tree
const { execution_tree } = await client.workflows.getExecutionTree(workflow_request_id);

// Get history
const { data: history } = await client.workflows.getHistory("version_id", { limit: 20 });

// Stop execution
await client.workflows.stop(workflow_request_id);

// Run and wait (blocks until complete)
const result = await client.workflows.runAndWait(
  {
    workflow_version_id: "version_id",
    chat_id: "chat_id",
    start_node_id: "node_id",
    query: "Summarize this",
  },
  60_000, // timeout in ms (default: 5 minutes)
);
```

## Chats

```ts
// Create a chat
const chat = await client.chats.create({
  name: "My Chat",
  resource_id: "version_id",
});

// Get a chat
const fetched = await client.chats.get(chat.id);

// List chats for a resource
const { chats } = await client.chats.listForResource("api", "version_id");

// Listen to chat events (SSE)
const chatStream = await client.chats.listen(chat.id);
for await (const event of chatStream) {
  if (event.eventType === "text_delta") {
    process.stdout.write(event.textDelta ?? "");
  } else if (event.eventType === "tool_call_start") {
    console.log(`\nCalling tool: ${event.toolName}`);
  } else if (event.eventType === "done") {
    console.log("\nIteration complete");
  }

  // Stop when workflow completes
  if (event.workflow_request?.status === "completed") {
    chatStream.close();
    break;
  }
}

/**
 * Event types:
 * - "text_delta": textDelta contains streamed text
 * - "reasoning_delta": reasoningDelta contains thinking
 * - "tool_call_start": toolCallId, toolName
 * - "tool_call_delta": toolCallId, toolArgsDelta
 * - "tool_complete": toolName, toolCallId, toolResult
 * - "tool_error": toolName, toolCallId, error
 * - "done": iteration complete
 * - "error": error message
 */

// Get message history
const { messages, has_more } = await client.chats.getHistory(chat.id, { limit: 50 });

// Delete history
await client.chats.deleteHistory(chat.id);

// Delete chat
await client.chats.delete(chat.id);
```

## Memory

Inspect and manage agent context memory — list instances, read messages, summarize, trim, clear, or export.

```ts
// List memory instances (paginated)
const { chats, has_more, next_cursor } = await client.memory.list("version_id", {
  limit: 20,
});
for (const inst of chats) {
  console.log(`${inst.memory_node_label}: ${inst.message_count} messages`);
}

// Get messages for an agent node
const { messages } = await client.memory.get("agent_node_id", {
  chat_id: "session_id",
  limit: 20,
});

// Summarize — compress older messages into an LLM-generated summary
const { summary, deleted_count } = await client.memory.summarize("agent_node_id", {
  context_memory_id: "session_id",
  workflow_version_id: "version_id",
  keep_last_n: 3,
});

// Trim — drop oldest messages to stay under a limit
await client.memory.trim("agent_node_id", {
  context_memory_id: "session_id",
  workflow_version_id: "version_id",
  max_messages: 20,
});

// Export all messages without modifying them
const exported = await client.memory.export("agent_node_id", {
  context_memory_id: "session_id",
  workflow_version_id: "version_id",
});

// Clear all messages
await client.memory.clear("agent_node_id", {
  context_memory_id: "session_id",
  workflow_version_id: "version_id",
});

// Delete a specific memory instance
await client.memory.delete("session_id", {
  memory_node_id: "agent_node_id",
  workflow_version_id: "version_id",
});
```

## MCP (Model Context Protocol)

Browse the MCP server catalog, manage end-user connections, and generate credential-submission links.

### Catalog

```ts
// Search the MCP catalog
const catalog = await client.mcp.listCatalog({ search: "github", per_page: 10 });
for (const server of catalog.mcp_servers) {
  console.log(`${server.name} — ${server.url}`);
}

// Get featured servers
const featured = await client.mcp.listCatalog({ featured: true });

// Get a single catalog item
const item = await client.mcp.getCatalogItem("mcp-server-id");
console.log(item.name, item.auth_type);
```

### Connections

```ts
// List all end-user connections
const { connections, total } = await client.mcp.listConnections();

// List owner-user MCP servers via the same endpoint
const ownerServers = await client.mcp.listConnections({
  scope: "owner_user",
});

// Filter by MCP server or end-user
const filtered = await client.mcp.listConnections({
  mcp_server_id: "server-id",
  end_user_id: "user-123",
});

// Delete a connection
await client.mcp.deleteConnection("connection-id");
```

### Connection Token & Link

Generate signed JWTs for end-user credential submission — no API call required:

```ts
import { generateConnectionToken, generateConnectionLink } from "splox";

// Generate a token (expires in 1 hour)
const token = await generateConnectionToken(
  "mcp-server-id",
  "owner-user-id",
  "end-user-id",
  "your-credentials-encryption-key",
);

// Generate a full connection link
const link = await generateConnectionLink(
  "https://app.splox.io",
  "mcp-server-id",
  "owner-user-id",
  "end-user-id",
  "your-credentials-encryption-key",
);
// → https://app.splox.io/tools/connect?token=eyJhbG...
```

## Events (Webhooks)

```ts
// Trigger a workflow via webhook
const { ok, event_id } = await client.events.send({
  webhookId: "webhook_id",
  payload: { key: "value" },
  secret: "optional-webhook-secret", // sent as X-Webhook-Secret header
});
```

## Error Handling

All API errors throw typed exceptions that extend `SploxAPIError`:

```ts
import {
  SploxAPIError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  GoneError,
  RateLimitError,
  ConnectionError,
  TimeoutError,
  StreamError,
} from "splox";

try {
  await client.workflows.get("bad-id");
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log("Not found:", err.message);
  } else if (err instanceof RateLimitError) {
    console.log("Retry after:", err.retryAfter);
  } else if (err instanceof AuthenticationError) {
    console.log("Bad API key");
  } else if (err instanceof ConnectionError) {
    console.log("Network error:", err.cause);
  }
}
```

| Error | Status | Description |
| --- | --- | --- |
| `AuthenticationError` | 401 | Invalid or missing API key |
| `ForbiddenError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource not found |
| `GoneError` | 410 | Resource permanently deleted |
| `RateLimitError` | 429 | Rate limit exceeded (check `retryAfter`) |
| `SploxAPIError` | other | Any other non-2xx response |
| `ConnectionError` | — | Network/DNS/TLS failure |
| `TimeoutError` | — | `runAndWait` exceeded deadline |
| `StreamError` | — | SSE stream read failure |

## Configuration

```ts
import Splox from "splox";

const client = new Splox("api-key", {
  baseURL: "https://custom.api.example.com/v1",
  fetch: customFetchImplementation,
});
```

### `client.mcp`

| Method | Returns | Description |
|--------|---------|-------------|
| `listCatalog(params?)` | `MCPCatalogListResponse` | Search/list MCP catalog (paginated) |
| `getCatalogItem(id)` | `MCPCatalogItem` | Get a single catalog item |
| `listConnections(params?)` | `MCPConnectionListResponse` | List MCP links by identity scope (`end_user` or `owner_user`) |
| `deleteConnection(id)` | `void` | Delete an end-user connection |
| `generateConnectionToken(...)` | `string` | Create a signed JWT (1 hr expiry) |
| `generateConnectionLink(...)` | `string` | Build a full connection URL |

### Standalone functions

| Function | Returns | Description |
|----------|---------|-------------|
| `generateConnectionToken(serverID, ownerID, endUserID, key)` | `Promise<string>` | Create a signed JWT |
| `generateConnectionLink(baseURL, serverID, ownerID, endUserID, key)` | `Promise<string>` | Build a full connection URL |

## Requirements

- **Node.js ≥ 18** (uses native `fetch` and Web Crypto API)
- **TypeScript ≥ 5.0** (optional, full type definitions included)

## License

MIT — see [LICENSE](LICENSE).
