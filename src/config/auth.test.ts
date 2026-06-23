import { describe, it, expect } from "vitest";
import { isValidKeyFormat } from "./auth.js";

describe("auth key format", () => {
  it("accepts keys starting with blaze-", () => {
    expect(isValidKeyFormat("blaze-abc123")).toBe(true);
  });
  it("rejects empty or wrong-prefix keys", () => {
    expect(isValidKeyFormat("")).toBe(false);
    expect(isValidKeyFormat("sk-abc")).toBe(false);
  });
});
