import { describe, it, expect } from "vitest";
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
  throwOnError,
} from "../src/errors.js";

describe("Error classes", () => {
  it("SploxAPIError stores statusCode and responseBody", () => {
    const err = new SploxAPIError(500, "server error", '{"error":"server error"}');
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe("server error");
    expect(err.responseBody).toBe('{"error":"server error"}');
    expect(err.name).toBe("SploxAPIError");
    expect(err).toBeInstanceOf(Error);
  });

  it("AuthenticationError is instanceof SploxAPIError", () => {
    const err = new AuthenticationError("unauthorized", "body");
    expect(err).toBeInstanceOf(SploxAPIError);
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("AuthenticationError");
  });

  it("ForbiddenError has status 403", () => {
    const err = new ForbiddenError("forbidden", "body");
    expect(err.statusCode).toBe(403);
    expect(err.name).toBe("ForbiddenError");
  });

  it("NotFoundError has status 404", () => {
    const err = new NotFoundError("not found", "body");
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe("NotFoundError");
  });

  it("GoneError has status 410", () => {
    const err = new GoneError("gone", "body");
    expect(err.statusCode).toBe(410);
    expect(err.name).toBe("GoneError");
  });

  it("RateLimitError stores retryAfter", () => {
    const err = new RateLimitError("slow down", "body", "30");
    expect(err.statusCode).toBe(429);
    expect(err.retryAfter).toBe("30");
    expect(err.name).toBe("RateLimitError");
  });

  it("ConnectionError wraps cause", () => {
    const cause = new Error("ECONNREFUSED");
    const err = new ConnectionError("failed", cause);
    expect(err.cause).toBe(cause);
    expect(err.name).toBe("ConnectionError");
  });

  it("TimeoutError", () => {
    const err = new TimeoutError("timed out");
    expect(err.message).toBe("timed out");
    expect(err.name).toBe("TimeoutError");
  });

  it("StreamError wraps cause", () => {
    const cause = new Error("read failed");
    const err = new StreamError("stream broke", cause);
    expect(err.cause).toBe(cause);
    expect(err.name).toBe("StreamError");
  });
});

describe("throwOnError", () => {
  function makeResponse(status: number, body: string, headers?: Record<string, string>): Response {
    return new Response(body, {
      status,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }

  it("does not throw for 200", async () => {
    await expect(throwOnError(makeResponse(200, "{}"))).resolves.toBeUndefined();
  });

  it("throws AuthenticationError for 401", async () => {
    await expect(
      throwOnError(makeResponse(401, '{"error":"invalid key"}')),
    ).rejects.toThrow(AuthenticationError);
  });

  it("throws ForbiddenError for 403", async () => {
    await expect(
      throwOnError(makeResponse(403, '{"error":"forbidden"}')),
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for 404", async () => {
    await expect(
      throwOnError(makeResponse(404, '{"error":"not found"}')),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws GoneError for 410", async () => {
    await expect(
      throwOnError(makeResponse(410, '{"error":"gone"}')),
    ).rejects.toThrow(GoneError);
  });

  it("throws RateLimitError for 429 with Retry-After header", async () => {
    try {
      await throwOnError(
        makeResponse(429, '{"error":"rate limited"}', { "Retry-After": "60" }),
      );
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe("60");
    }
  });

  it("throws SploxAPIError for unknown status codes", async () => {
    await expect(
      throwOnError(makeResponse(502, '{"error":"bad gateway"}')),
    ).rejects.toThrow(SploxAPIError);
  });

  it("handles non-JSON error bodies", async () => {
    try {
      await throwOnError(makeResponse(500, "Internal Server Error"));
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SploxAPIError);
      expect((err as SploxAPIError).message).toBe("Internal Server Error");
    }
  });

  it("extracts error field from JSON body", async () => {
    try {
      await throwOnError(makeResponse(404, '{"error":"workflow not found"}'));
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as SploxAPIError).message).toBe("workflow not found");
    }
  });
});
