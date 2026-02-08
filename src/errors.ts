/**
 * Splox API error hierarchy.
 *
 * All API errors extend {@link SploxAPIError}. Use `instanceof` to narrow:
 *
 * ```ts
 * try {
 *   await client.workflows.get("bad-id");
 * } catch (err) {
 *   if (err instanceof NotFoundError) {
 *     console.log("Not found:", err.message);
 *   }
 * }
 * ```
 */

/** Base class for all Splox API errors (non-2xx responses). */
export class SploxAPIError extends Error {
  readonly statusCode: number;
  readonly responseBody: string;

  constructor(statusCode: number, message: string, responseBody: string) {
    super(message);
    this.name = "SploxAPIError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/** 401 Unauthorized — invalid or missing API key. */
export class AuthenticationError extends SploxAPIError {
  constructor(message: string, responseBody: string) {
    super(401, message, responseBody);
    this.name = "AuthenticationError";
  }
}

/** 403 Forbidden — valid key but insufficient permissions. */
export class ForbiddenError extends SploxAPIError {
  constructor(message: string, responseBody: string) {
    super(403, message, responseBody);
    this.name = "ForbiddenError";
  }
}

/** 404 Not Found — the requested resource does not exist. */
export class NotFoundError extends SploxAPIError {
  constructor(message: string, responseBody: string) {
    super(404, message, responseBody);
    this.name = "NotFoundError";
  }
}

/** 410 Gone — the resource has been permanently deleted. */
export class GoneError extends SploxAPIError {
  constructor(message: string, responseBody: string) {
    super(410, message, responseBody);
    this.name = "GoneError";
  }
}

/** 429 Too Many Requests — rate limit exceeded. */
export class RateLimitError extends SploxAPIError {
  readonly retryAfter?: string;

  constructor(message: string, responseBody: string, retryAfter?: string) {
    super(429, message, responseBody);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** Transport-level error (DNS, TCP, TLS failures). */
export class ConnectionError extends Error {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "ConnectionError";
    this.cause = cause;
  }
}

/** Timeout waiting for a workflow to complete (used by `runAndWait`). */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Error parsing the SSE stream. */
export class StreamError extends Error {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "StreamError";
    this.cause = cause;
  }
}

/**
 * Parse an HTTP response and throw a typed error for non-2xx status codes.
 * @internal
 */
export async function throwOnError(response: Response): Promise<void> {
  if (response.ok) return;

  const body = await response.text();
  let message = body;

  try {
    const parsed = JSON.parse(body);
    if (parsed.error) message = parsed.error;
  } catch {
    // body is not JSON — use raw text
  }

  switch (response.status) {
    case 401:
      throw new AuthenticationError(message, body);
    case 403:
      throw new ForbiddenError(message, body);
    case 404:
      throw new NotFoundError(message, body);
    case 410:
      throw new GoneError(message, body);
    case 429:
      throw new RateLimitError(
        message,
        body,
        response.headers.get("Retry-After") ?? undefined,
      );
    default:
      throw new SploxAPIError(response.status, message, body);
  }
}
