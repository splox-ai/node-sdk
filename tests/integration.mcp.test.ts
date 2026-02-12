import { describe, it, expect, beforeAll } from "vitest";
import { Splox } from "../src/client.js";

const apiKey = process.env.SPLOX_API_KEY;
const baseURLRaw = process.env.SPLOX_BASE_URL || "https://app.splox.io/api/v1";
const baseURL = /^https?:\/\//.test(baseURLRaw) ? baseURLRaw : `https://${baseURLRaw}`;

const searchQuery = process.env.SPLOX_MCP_SEARCH_QUERY || "";
const mcpServerId = process.env.SPLOX_MCP_SERVER_ID;
const mcpToolSlug = process.env.SPLOX_MCP_TOOL_SLUG;
const mcpToolArgsJson = process.env.SPLOX_MCP_TOOL_ARGS_JSON || "{}";

describe.skipIf(!apiKey)("MCP integration tests", () => {
  let client: Splox;

  beforeAll(() => {
    client = new Splox(apiKey!, { baseURL });
  });

  it("lists user MCP connections", async () => {
    const resp = await client.mcp.listUserConnections();
    expect(resp.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(resp.connections)).toBe(true);
  });

  it("searches MCP servers", async () => {
    const resp = await client.mcp.search({
      search_query: searchQuery,
      limit: 10,
      offset: 0,
    });

    expect(resp.limit).toBeGreaterThanOrEqual(0);
    expect(resp.offset).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(resp.results)).toBe(true);
  });

  it.skipIf(!mcpServerId || !mcpToolSlug)("executes MCP tool", async () => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(mcpToolArgsJson);
    } catch (err) {
      throw new Error(`Invalid SPLOX_MCP_TOOL_ARGS_JSON: ${String(err)}`);
    }

    const resp = await client.mcp.executeTool({
      mcp_server_id: mcpServerId!,
      tool_slug: mcpToolSlug!,
      args,
    });

    expect(typeof resp.is_error).toBe("boolean");
    expect(resp.result).toBeDefined();
  });
});
