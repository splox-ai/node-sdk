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
    const resp = await client.mcp.listUserServers();
    expect(resp.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(resp.servers)).toBe(true);
  });

  it("searches MCP servers", async () => {
    const catalog = await client.mcp.listCatalog({
      search: searchQuery,
      per_page: 10,
    });
    expect(catalog.total_count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(catalog.mcp_servers)).toBe(true);

    const servers = await client.mcp.listUserServers();
    if (servers.servers.length > 0) {
      const tools = await client.mcp.getServerTools(servers.servers[0].id);
      expect(tools.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(tools.options)).toBe(true);
    }
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
