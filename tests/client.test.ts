import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer, type IncomingMessage, type ServerResponse, type Server } from "http";
import { Splox } from "../src/client.js";
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  GoneError,
  RateLimitError,
  SploxAPIError,
  ConnectionError,
} from "../src/errors.js";

// ── Test server ──────────────────────────────────────────────────────────────

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let server: Server;
let baseURL: string;
let handler: Handler;

function setHandler(h: Handler) {
  handler = h;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => resolve(data));
  });
}

beforeAll(async () => {
  server = createServer((req, res) => handler(req, res));
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const addr = server.address();
  if (typeof addr === "object" && addr) {
    baseURL = `http://127.0.0.1:${addr.port}`;
  }
});

afterAll(() => {
  server.close();
});

function makeClient(apiKey = "test-key") {
  return new Splox(apiKey, { baseURL });
}

// ── Client tests ─────────────────────────────────────────────────────────────

describe("Splox", () => {
  it("sends Authorization header", async () => {
    let authHeader: string | undefined;
    setHandler((req, res) => {
      authHeader = req.headers.authorization;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ workflows: [], pagination: { limit: 20, has_more: false } }));
    });

    const client = makeClient("my-secret-key");
    await client.workflows.list();
    expect(authHeader).toBe("Bearer my-secret-key");
  });

  it("falls back to SPLOX_API_KEY env var", () => {
    const original = process.env.SPLOX_API_KEY;
    process.env.SPLOX_API_KEY = "env-key";
    try {
      // Just verify it constructs without error
      const client = new Splox(undefined, { baseURL });
      expect(client).toBeDefined();
    } finally {
      if (original === undefined) delete process.env.SPLOX_API_KEY;
      else process.env.SPLOX_API_KEY = original;
    }
  });
});

// ── Workflow tests ───────────────────────────────────────────────────────────

describe("WorkflowService", () => {
  it("list() returns workflows", async () => {
    setHandler((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        workflows: [{ id: "wf_1", user_id: "u_1" }],
        pagination: { limit: 20, has_more: false },
      }));
    });

    const client = makeClient();
    const result = await client.workflows.list();
    expect(result.workflows).toHaveLength(1);
    expect(result.workflows[0].id).toBe("wf_1");
  });

  it("list() sends query params", async () => {
    let url: string | undefined;
    setHandler((req, res) => {
      url = req.url;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ workflows: [], pagination: { limit: 5, has_more: false } }));
    });

    const client = makeClient();
    await client.workflows.list({ limit: 5, search: "test" });
    expect(url).toContain("limit=5");
    expect(url).toContain("search=test");
  });

  it("get() returns full workflow", async () => {
    setHandler((req, res) => {
      expect(req.url).toBe("/workflows/wf_123");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        workflow: { id: "wf_123", user_id: "u_1" },
        workflow_version: { id: "wv_1", workflow_id: "wf_123", version_number: 1, name: "v1", status: "active" },
        nodes: [],
        edges: [],
      }));
    });

    const client = makeClient();
    const result = await client.workflows.get("wf_123");
    expect(result.workflow.id).toBe("wf_123");
    expect(result.workflow_version.name).toBe("v1");
  });

  it("getLatestVersion() returns version", async () => {
    setHandler((req, res) => {
      expect(req.url).toBe("/workflows/wf_1/versions/latest");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "wv_1", workflow_id: "wf_1", version_number: 3, name: "v3", status: "active" }));
    });

    const client = makeClient();
    const version = await client.workflows.getLatestVersion("wf_1");
    expect(version.version_number).toBe(3);
  });

  it("listVersions() returns versions", async () => {
    setHandler((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ versions: [{ id: "wv_1", workflow_id: "wf_1", version_number: 1, name: "v1", status: "active" }] }));
    });

    const client = makeClient();
    const result = await client.workflows.listVersions("wf_1");
    expect(result.versions).toHaveLength(1);
  });

  it("getStartNodes() returns nodes", async () => {
    setHandler((req, res) => {
      expect(req.url).toBe("/workflows/wv_1/start-nodes");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ nodes: [{ id: "n_1", workflow_version_id: "wv_1", node_type: "start", label: "Start" }] }));
    });

    const client = makeClient();
    const result = await client.workflows.getStartNodes("wv_1");
    expect(result.nodes[0].label).toBe("Start");
  });

  it("run() sends correct body and returns request ID", async () => {
    let body: string = "";
    setHandler(async (req, res) => {
      body = await readBody(req);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ workflow_request_id: "wr_1" }));
    });

    const client = makeClient();
    const result = await client.workflows.run({
      workflow_version_id: "wv_1",
      chat_id: "chat_1",
      start_node_id: "n_1",
      query: "hello",
    });

    expect(result.workflow_request_id).toBe("wr_1");
    const parsed = JSON.parse(body);
    expect(parsed.workflow_version_id).toBe("wv_1");
    expect(parsed.query).toBe("hello");
  });

  it("getExecutionTree() returns tree", async () => {
    setHandler((req, res) => {
      expect(req.url).toBe("/workflow-requests/wr_1/execution-tree");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        execution_tree: {
          workflow_request_id: "wr_1",
          status: "completed",
          created_at: "2026-01-01T00:00:00Z",
          nodes: [],
        },
      }));
    });

    const client = makeClient();
    const result = await client.workflows.getExecutionTree("wr_1");
    expect(result.execution_tree.status).toBe("completed");
  });

  it("getHistory() sends params", async () => {
    let url: string | undefined;
    setHandler((req, res) => {
      url = req.url;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [], pagination: { limit: 10, has_more: false } }));
    });

    const client = makeClient();
    await client.workflows.getHistory("wr_1", { limit: 10 });
    expect(url).toContain("limit=10");
  });

  it("stop() sends POST", async () => {
    let method: string | undefined;
    let url: string | undefined;
    setHandler((req, res) => {
      method = req.method;
      url = req.url;
      res.writeHead(204);
      res.end();
    });

    const client = makeClient();
    await client.workflows.stop("wr_1");
    expect(method).toBe("POST");
    expect(url).toBe("/workflow-requests/wr_1/stop");
  });

  it("listen() opens SSE stream", async () => {
    setHandler((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write('data: {"workflow_request":{"id":"wr_1","status":"completed","workflow_version_id":"v1","start_node_id":"n1","created_at":"now"}}\n\n');
      res.end();
    });

    const client = makeClient();
    const stream = await client.workflows.listen("wr_1");
    const events = [];
    for await (const event of stream) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0].workflow_request?.status).toBe("completed");
  });
});

// ── Chat tests ───────────────────────────────────────────────────────────────

describe("ChatService", () => {
  it("create() sends body and returns chat", async () => {
    let body: string = "";
    setHandler(async (req, res) => {
      body = await readBody(req);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "chat_1", name: "Test Chat" }));
    });

    const client = makeClient();
    const chat = await client.chats.create({ name: "Test Chat", resource_id: "wv_1" });
    expect(chat.id).toBe("chat_1");
    const parsed = JSON.parse(body);
    expect(parsed.resource_type).toBe("api");
  });

  it("get() returns chat", async () => {
    setHandler((req, res) => {
      expect(req.url).toBe("/chats/chat_1");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "chat_1", name: "My Chat" }));
    });

    const client = makeClient();
    const chat = await client.chats.get("chat_1");
    expect(chat.name).toBe("My Chat");
  });

  it("listForResource() returns chats", async () => {
    setHandler((req, res) => {
      expect(req.url).toBe("/chats/api/wv_1");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ chats: [{ id: "chat_1", name: "Chat" }] }));
    });

    const client = makeClient();
    const result = await client.chats.listForResource("api", "wv_1");
    expect(result.chats).toHaveLength(1);
  });

  it("getHistory() returns messages with pagination", async () => {
    let url: string | undefined;
    setHandler((req, res) => {
      url = req.url;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ messages: [], has_more: false }));
    });

    const client = makeClient();
    await client.chats.getHistory("chat_1", { limit: 50, before: "2026-01-01T00:00:00Z" });
    expect(url).toContain("limit=50");
    expect(url).toContain("before=");
  });

  it("delete() sends DELETE", async () => {
    let method: string | undefined;
    setHandler((req, res) => {
      method = req.method;
      res.writeHead(204);
      res.end();
    });

    const client = makeClient();
    await client.chats.delete("chat_1");
    expect(method).toBe("DELETE");
  });

  it("deleteHistory() sends DELETE to correct path", async () => {
    let url: string | undefined;
    setHandler((req, res) => {
      url = req.url;
      res.writeHead(204);
      res.end();
    });

    const client = makeClient();
    await client.chats.deleteHistory("chat_1");
    expect(url).toBe("/chat-history/chat_1");
  });

  it("listen() opens SSE stream", async () => {
    setHandler((req, res) => {
      expect(req.url).toBe("/chat-internal-messages/chat_1/listen");
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.write("data: keepalive\n\n");
      res.end();
    });

    const client = makeClient();
    const stream = await client.chats.listen("chat_1");
    const events = [];
    for await (const event of stream) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0].isKeepalive).toBe(true);
  });
});

// ── Event tests ──────────────────────────────────────────────────────────────

describe("EventService", () => {
  it("send() posts payload to webhook", async () => {
    let body: string = "";
    let url: string | undefined;
    setHandler(async (req, res) => {
      url = req.url;
      body = await readBody(req);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, event_id: "evt_1" }));
    });

    const client = makeClient();
    const result = await client.events.send({
      webhookId: "wh_123",
      payload: { key: "value" },
    });

    expect(url).toBe("/events/wh_123");
    expect(result.ok).toBe(true);
    expect(result.event_id).toBe("evt_1");
    expect(JSON.parse(body)).toEqual({ key: "value" });
  });

  it("send() includes X-Webhook-Secret header", async () => {
    let secretHeader: string | undefined;
    setHandler((req, res) => {
      secretHeader = req.headers["x-webhook-secret"] as string;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, event_id: "evt_2" }));
    });

    const client = makeClient();
    await client.events.send({
      webhookId: "wh_123",
      payload: { data: "test" },
      secret: "my-secret",
    });

    expect(secretHeader).toBe("my-secret");
  });

  it("send() with empty payload sends {}", async () => {
    let body: string = "";
    setHandler(async (req, res) => {
      body = await readBody(req);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, event_id: "evt_3" }));
    });

    const client = makeClient();
    await client.events.send({ webhookId: "wh_123" });
    expect(JSON.parse(body)).toEqual({});
  });
});

// ── Error handling tests ─────────────────────────────────────────────────────

describe("Error handling", () => {
  it("401 throws AuthenticationError", async () => {
    setHandler((_req, res) => {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid api key" }));
    });

    const client = makeClient();
    await expect(client.workflows.list()).rejects.toThrow(AuthenticationError);
  });

  it("403 throws ForbiddenError", async () => {
    setHandler((_req, res) => {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "forbidden" }));
    });

    const client = makeClient();
    await expect(client.workflows.get("wf_1")).rejects.toThrow(ForbiddenError);
  });

  it("404 throws NotFoundError", async () => {
    setHandler((_req, res) => {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    });

    const client = makeClient();
    await expect(client.workflows.get("wf_bad")).rejects.toThrow(NotFoundError);
  });

  it("410 throws GoneError", async () => {
    setHandler((_req, res) => {
      res.writeHead(410, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "gone" }));
    });

    const client = makeClient();
    await expect(client.workflows.get("wf_old")).rejects.toThrow(GoneError);
  });

  it("429 throws RateLimitError", async () => {
    setHandler((_req, res) => {
      res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "30" });
      res.end(JSON.stringify({ error: "rate limited" }));
    });

    const client = makeClient();
    try {
      await client.workflows.list();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe("30");
    }
  });

  it("500 throws SploxAPIError", async () => {
    setHandler((_req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "internal" }));
    });

    const client = makeClient();
    await expect(client.workflows.list()).rejects.toThrow(SploxAPIError);
  });

  it("connection refused throws ConnectionError", async () => {
    const client = new Splox("key", { baseURL: "http://127.0.0.1:1" });
    await expect(client.workflows.list()).rejects.toThrow(ConnectionError);
  });
});
