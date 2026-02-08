import { describe, it, expect } from "vitest";
import { addParams } from "../src/transport.js";

describe("addParams", () => {
  it("returns path unchanged when no params", () => {
    expect(addParams("/foo", {})).toBe("/foo");
  });

  it("appends params to path", () => {
    const result = addParams("/foo", { limit: 10, cursor: "abc" });
    expect(result).toContain("/foo?");
    expect(result).toContain("limit=10");
    expect(result).toContain("cursor=abc");
  });

  it("skips undefined values", () => {
    const result = addParams("/bar", { limit: 5, cursor: undefined });
    expect(result).toBe("/bar?limit=5");
  });

  it("returns path when all values are undefined", () => {
    const result = addParams("/baz", { a: undefined, b: undefined });
    expect(result).toBe("/baz");
  });
});
