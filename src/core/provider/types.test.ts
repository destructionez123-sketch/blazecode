import { describe, it, expect } from "vitest";
import type { StreamEvent } from "./types.js";
import { isToolCall } from "./types.js";

describe("provider types", () => {
  it("isToolCall narrows tool_call events", () => {
    const ev: StreamEvent = { type: "tool_call", tool: { id: "1", name: "read", input: {} } };
    expect(isToolCall(ev)).toBe(true);
    expect(isToolCall({ type: "text_delta", text: "hi" })).toBe(false);
  });
});
