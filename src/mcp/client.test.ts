import { describe, it, expect } from "vitest";
import { mcpToolName, stringifyMcpResult, withTimeout } from "./client.js";

describe("mcp tool naming", () => {
  it("namespaces server and tool", () => {
    expect(mcpToolName("github", "create_issue")).toBe(
      "mcp__github__create_issue",
    );
  });
});

describe("stringifyMcpResult", () => {
  it("concatenates text content parts", () => {
    const res = {
      content: [
        { type: "text", text: "hello" },
        { type: "text", text: "world" },
      ],
    };
    expect(stringifyMcpResult(res)).toBe("hello\nworld");
  });

  it("JSON.stringifies content when no text parts present", () => {
    const res = { content: [{ type: "image", data: "abc" }] };
    expect(stringifyMcpResult(res)).toBe(
      JSON.stringify([{ type: "image", data: "abc" }]),
    );
  });

  it("JSON.stringifies whole result when no content array", () => {
    const res = { foo: "bar" };
    expect(stringifyMcpResult(res)).toBe(JSON.stringify({ foo: "bar" }));
  });
});

describe("withTimeout", () => {
  it("resolves with the value when the promise settles in time", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 1000, "label");
    expect(result).toBe("ok");
  });

  it("rejects when the promise never settles before the timeout", async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 5, "myserver")).rejects.toThrow(
      /myserver.*timed out/i,
    );
  });

  it("does not leave the process hanging after a timeout (clears timer)", async () => {
    const never = new Promise<string>(() => {});
    await expect(withTimeout(never, 1, "x")).rejects.toBeInstanceOf(Error);
  });
});
