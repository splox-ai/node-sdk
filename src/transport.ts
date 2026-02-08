import { ConnectionError, throwOnError } from "./errors.js";

export interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** If true, return the raw Response (used for SSE). */
  raw?: boolean;
}

/**
 * Low-level HTTP transport for the Splox API.
 * @internal
 */
export class Transport {
  constructor(
    private readonly baseURL: string,
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch,
  ) {}

  /** Make a JSON request and decode the response. */
  async request<T>(options: RequestOptions): Promise<T> {
    const url = options.path.startsWith("http")
      ? options.path
      : `${this.baseURL}${options.path}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method: options.method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });
    } catch (err) {
      throw new ConnectionError(
        `Failed to connect to ${url}`,
        err instanceof Error ? err : undefined,
      );
    }

    if (options.raw) {
      return response as unknown as T;
    }

    await throwOnError(response);

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  /** Open an SSE connection and return the raw Response. */
  async stream(path: string, signal?: AbortSignal): Promise<Response> {
    const url = `${this.baseURL}${path}`;

    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method: "GET",
        headers,
        signal,
      });
    } catch (err) {
      throw new ConnectionError(
        `Failed to connect to SSE stream at ${url}`,
        err instanceof Error ? err : undefined,
      );
    }

    await throwOnError(response);
    return response;
  }
}

/**
 * Append query parameters to a path.
 * @internal
 */
export function addParams(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined,
  );

  if (entries.length === 0) return path;

  const qs = new URLSearchParams(
    entries.map(([k, v]): [string, string] => [k, String(v)]),
  ).toString();

  return `${path}?${qs}`;
}
