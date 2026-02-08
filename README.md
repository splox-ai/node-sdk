# Splox Node.js/TypeScript SDK

[![npm](https://img.shields.io/npm/v/splox)](https://www.npmjs.com/package/splox)
[![CI](https://github.com/splox-ai/node-sdk/actions/workflows/test.yml/badge.svg)](https://github.com/splox-ai/node-sdk/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Official Node.js/TypeScript SDK for the [Splox API](https://docs.splox.io). Zero dependencies — uses the built-in `fetch` API (Node.js ≥ 18).

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
  console.log(event);
}

// Get message history
const { messages, has_more } = await client.chats.getHistory(chat.id, { limit: 50 });

// Delete history
await client.chats.deleteHistory(chat.id);

// Delete chat
await client.chats.delete(chat.id);
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

## Requirements

- **Node.js ≥ 18** (uses native `fetch`)
- **TypeScript ≥ 5.0** (optional, full type definitions included)

## License

MIT — see [LICENSE](LICENSE).
