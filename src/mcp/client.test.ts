import { describe, it, expect } from "vitest";
import { mcpToolName, stringifyMcpResult } from "./client.js";

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
