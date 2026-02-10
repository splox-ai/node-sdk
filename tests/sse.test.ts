import { describe, it, expect } from "vitest";
import { SSEStream } from "../src/sse.js";

function makeSSEResponse(data: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

async function collectEvents(stream: SSEStream) {
  const events = [];
  for await (const event of stream) {
    events.push(event);
  }
  return events;
}

describe("SSEStream", () => {
  it("parses keepalive events", async () => {
    const response = makeSSEResponse("data: keepalive\n\n");
    const stream = new SSEStream(response);
    const events = await collectEvents(stream);

    expect(events).toHaveLength(1);
    expect(events[0].isKeepalive).toBe(true);
    expect(events[0].rawData).toBe("keepalive");
  });

  it("parses JSON workflow_request events", async () => {
    const payload = JSON.stringify({
      workflow_request: {
        id: "req_1",
        status: "running",
        workflow_version_id: "wv_1",
        start_node_id: "n_1",
        created_at: "2026-01-01T00:00:00Z",
      },
    });
    const response = makeSSEResponse(`data: ${payload}\n\n`);
    const stream = new SSEStream(response);
    const events = await collectEvents(stream);

    expect(events).toHaveLength(1);
    expect(events[0].isKeepalive).toBe(false);
    expect(events[0].workflow_request?.id).toBe("req_1");
    expect(events[0].workflow_request?.status).toBe("running");
  });

  it("parses JSON node_execution events", async () => {
    const payload = JSON.stringify({
      node_execution: {
        id: "ne_1",
        workflow_request_id: "req_1",
        node_id: "n_1",
        workflow_version_id: "wv_1",
        status: "completed",
        output_data: { result: "hello" },
      },
    });
    const response = makeSSEResponse(`data: ${payload}\n\n`);
    const stream = new SSEStream(response);
    const events = await collectEvents(stream);

    expect(events).toHaveLength(1);
    expect(events[0].node_execution?.id).toBe("ne_1");
    expect(events[0].node_execution?.status).toBe("completed");
    expect(events[0].node_execution?.output_data).toEqual({ result: "hello" });
  });

  it("handles invalid JSON gracefully", async () => {
    const response = makeSSEResponse("data: {invalid-json}\n\n");
    const stream = new SSEStream(response);
    const events = await collectEvents(stream);

    expect(events).toHaveLength(1);
    expect(events[0].isKeepalive).toBe(false);
    expect(events[0].rawData).toBe("{invalid-json}");
    expect(events[0].workflow_request).toBeUndefined();
  });

  it("skips comment lines and empty lines", async () => {
    const payload = JSON.stringify({
      workflow_request: { id: "req_1", status: "completed", workflow_version_id: "wv_1", start_node_id: "n_1", created_at: "now" },
    });
    const data = `: this is a comment\n\ndata: ${payload}\n\n`;
    const response = makeSSEResponse(data);
    const stream = new SSEStream(response);
    const events = await collectEvents(stream);

    expect(events).toHaveLength(1);
    expect(events[0].workflow_request?.id).toBe("req_1");
  });

  it("handles multiple events in one stream", async () => {
    const ev1 = JSON.stringify({ workflow_request: { id: "req_1", status: "running", workflow_version_id: "v1", start_node_id: "n1", created_at: "now" } });
    const ev2 = JSON.stringify({ node_execution: { id: "ne_1", workflow_request_id: "req_1", node_id: "n1", workflow_version_id: "v1", status: "running" } });
    const ev3 = JSON.stringify({ workflow_request: { id: "req_1", status: "completed", workflow_version_id: "v1", start_node_id: "n1", created_at: "now" } });

    const data = `data: ${ev1}\n\ndata: keepalive\n\ndata: ${ev2}\n\ndata: ${ev3}\n\n`;
    const response = makeSSEResponse(data);
    const stream = new SSEStream(response);
    const events = await collectEvents(stream);

    expect(events).toHaveLength(4);
    expect(events[0].workflow_request?.status).toBe("running");
    expect(events[1].isKeepalive).toBe(true);
    expect(events[2].node_execution?.id).toBe("ne_1");
    expect(events[3].workflow_request?.status).toBe("completed");
  });

  it("handles empty stream", async () => {
    const response = makeSSEResponse("");
    const stream = new SSEStream(response);
    const events = await collectEvents(stream);

    expect(events).toHaveLength(0);
  });

  it("close() stops iteration", async () => {
    // Create a stream that would send data forever
    const encoder = new TextEncoder();
    let interval: ReturnType<typeof setInterval>;
    const readableStream = new ReadableStream({
      start(controller) {
        let count = 0;
        interval = setInterval(() => {
          controller.enqueue(encoder.encode("data: keepalive\n\n"));
          count++;
          if (count > 100) controller.close();
        }, 1);
      },
      cancel() {
        clearInterval(interval);
      },
    });

    const response = new Response(readableStream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });

    const stream = new SSEStream(response);
    const events = [];

    for await (const event of stream) {
      events.push(event);
      if (events.length >= 2) {
        stream.close();
        break;
      }
    }

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].isKeepalive).toBe(true);
  });

  it("throws StreamError when response body is null", () => {
    const response = new Response(null, { status: 200 });
    // body is null for a null-body response
    expect(() => new SSEStream(response)).toThrow("Response body is null");
  });
});
