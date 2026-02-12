import type { Transport } from "./transport.js";
import { addParams } from "./transport.js";
import type { RequestOptions } from "./client.js";
import type {
  MCPCatalogItem,
  MCPCatalogListResponse,
  MCPCatalogResponse,
  MCPConnectionListResponse,
  MCPExecuteToolResponse,
  MCPSearchResponse,
  MCPUserConnectionsResponse,
} from "./types.js";

// ── Parameter types ──────────────────────────────────────────────────────────

export interface CatalogParams {
  /** Page number (default 1). */
  page?: number;
  /** Items per page (1-100, default 20). */
  per_page?: number;
  /** Search string to filter by name, description, or URL. */
  search?: string;
  /** Filter to featured servers only. */
  featured?: boolean;
}

export interface ConnectionParams {
  /** Filter by MCP server ID. */
  mcp_server_id?: string;
  /** Filter by end-user ID. */
  end_user_id?: string;
}

export interface ExecuteToolParams {
  /** MCP server UUID configured by the authenticated user. */
  mcp_server_id: string;
  /** Tool name/slug on that MCP server. */
  tool_slug: string;
  /** Tool input arguments. */
  args?: Record<string, unknown>;
}

export interface SearchMCPParams {
  /** Search query for MCP name/description/url. */
  search_query?: string;
  /** Maximum number of catalog results (default 10, max 100). */
  limit?: number;
  /** Pagination offset (default 0). */
  offset?: number;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class MCPService {
  /** @internal */
  constructor(private readonly transport: Transport) {}

  // ── Catalog ──────────────────────────────────────────────────────────────

  /** List MCP servers from the catalog with optional filters. */
  async listCatalog(
    params?: CatalogParams,
    options?: RequestOptions,
  ): Promise<MCPCatalogListResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams("/mcp-catalog", {
        page: params?.page,
        per_page: params?.per_page,
        search: params?.search,
        featured: params?.featured ? "true" : undefined,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Get a single MCP server from the catalog by ID. */
  async getCatalogItem(
    id: string,
    options?: RequestOptions,
  ): Promise<MCPCatalogItem> {
    const resp = await this.transport.request<MCPCatalogResponse>({
      method: "GET",
      path: `/mcp-catalog/${id}`,
      signal: options?.signal,
      headers: options?.headers,
    });
    return resp.mcp_server;
  }

  // ── Connections ──────────────────────────────────────────────────────────

  /** List MCP connections for the authenticated user. */
  async listConnections(
    params?: ConnectionParams,
    options?: RequestOptions,
  ): Promise<MCPConnectionListResponse> {
    return this.transport.request({
      method: "GET",
      path: addParams("/mcp-connections", {
        mcp_server_id: params?.mcp_server_id,
        end_user_id: params?.end_user_id,
      }),
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Delete an end-user MCP connection by ID. */
  async deleteConnection(
    id: string,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/mcp-connections/${id}`,
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Execute a tool on a caller-owned MCP server. */
  async executeTool(
    params: ExecuteToolParams,
    options?: RequestOptions,
  ): Promise<MCPExecuteToolResponse> {
    return this.transport.request({
      method: "POST",
      path: "/mcp-tools/execute",
      body: {
        mcp_server_id: params.mcp_server_id,
        tool_slug: params.tool_slug,
        args: params.args ?? {},
      },
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** List caller-owned MCP connections grouped by MCP URL, including available tools. */
  async listUserConnections(options?: RequestOptions): Promise<MCPUserConnectionsResponse> {
    return this.transport.request({
      method: "POST",
      path: "/mcp-tools/list-user-connections",
      body: {},
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  /** Search MCP servers with connection status, matching tool_router behavior. */
  async search(
    params?: SearchMCPParams,
    options?: RequestOptions,
  ): Promise<MCPSearchResponse> {
    return this.transport.request({
      method: "POST",
      path: "/mcp-tools/search",
      body: {
        search_query: params?.search_query ?? "",
        limit: params?.limit,
        offset: params?.offset,
      },
      signal: options?.signal,
      headers: options?.headers,
    });
  }

  // ── Connection Token ─────────────────────────────────────────────────────

  /**
   * Generate a signed JWT for end-user credential submission.
   *
   * This is the client-side equivalent of the backend's
   * `mcp.GenerateConnectionToken`. The token expires after 1 hour.
   */
  async generateConnectionToken(
    mcpServerID: string,
    ownerUserID: string,
    endUserID: string,
    credentialsEncryptionKey: string,
  ): Promise<string> {
    return generateConnectionToken(
      mcpServerID,
      ownerUserID,
      endUserID,
      credentialsEncryptionKey,
    );
  }

  /**
   * Build a full connection URL that end-users can visit to submit
   * their credentials for a specific MCP server.
   *
   * @param baseURL - The Splox application URL (e.g. "https://app.splox.io").
   */
  async generateConnectionLink(
    baseURL: string,
    mcpServerID: string,
    ownerUserID: string,
    endUserID: string,
    credentialsEncryptionKey: string,
  ): Promise<string> {
    const token = await generateConnectionToken(
      mcpServerID,
      ownerUserID,
      endUserID,
      credentialsEncryptionKey,
    );
    return `${baseURL.replace(/\/+$/, "")}/tools/connect?token=${token}`;
  }
}

// ── JWT helpers (standalone, no external dependency) ─────────────────────────

const MCP_CONNECTION_ISSUER = "splox-mcp-connection";
const MCP_CONNECTION_EXPIRY_SECONDS = 60 * 60; // 1 hour

function base64URLEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textEncode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

async function deriveSigningKey(credentialsEncryptionKey: string): Promise<unknown> {
  const keyMaterial = textEncode("mcp-connection-jwt:" + credentialsEncryptionKey);
  const hash = await crypto.subtle.digest("SHA-256", keyMaterial);

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/**
 * Generate a signed HS256 JWT for end-user MCP credential submission.
 * Uses the Web Crypto API — works in Node.js >= 18 and all modern browsers.
 */
async function generateConnectionToken(
  mcpServerID: string,
  ownerUserID: string,
  endUserID: string,
  credentialsEncryptionKey: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    mcp_server_id: mcpServerID,
    owner_user_id: ownerUserID,
    end_user_id: endUserID,
    iss: MCP_CONNECTION_ISSUER,
    iat: now,
    exp: now + MCP_CONNECTION_EXPIRY_SECONDS,
  };

  const encodedHeader = base64URLEncode(textEncode(JSON.stringify(header)));
  const encodedPayload = base64URLEncode(textEncode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await deriveSigningKey(credentialsEncryptionKey);
  const signature = await crypto.subtle.sign("HMAC", key as Parameters<typeof crypto.subtle.sign>[1], textEncode(signingInput));

  return `${signingInput}.${base64URLEncode(new Uint8Array(signature))}`;
}

export {
  generateConnectionToken,
  generateConnectionLink,
};

/**
 * Build a full connection URL (standalone function).
 *
 * @param baseURL - The Splox application URL (e.g. "https://app.splox.io").
 */
async function generateConnectionLink(
  baseURL: string,
  mcpServerID: string,
  ownerUserID: string,
  endUserID: string,
  credentialsEncryptionKey: string,
): Promise<string> {
  const token = await generateConnectionToken(
    mcpServerID,
    ownerUserID,
    endUserID,
    credentialsEncryptionKey,
  );
  return `${baseURL.replace(/\/+$/, "")}/tools/connect?token=${token}`;
}
