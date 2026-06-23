import { describe, it, expect } from "vitest";
import { buildAnthropicBody, mapAnthropicEvent } from "./anthropic.js";

describe("buildAnthropicBody", () => {
  it("includes thinking when enabled and maps tools to input_schema", () => {
    const body = buildAnthropicBody({
      model: "claude-opus-4-8",
      system: "be helpful",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [{ name: "read", description: "read a file", inputSchema: { type: "object" } }],
      thinking: { enabled: true, budgetTokens: 2000 },
      maxTokens: 1024,
    }) as any;
    expect(body.model).toBe("claude-opus-4-8");
    expect(body.system).toBe("be helpful");
    expect(body.stream).toBe(true);
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 2000 });
    expect(body.tools[0]).toEqual({
      name: "read",
      description: "read a file",
      input_schema: { type: "object" },
    });
  });

  it("omits thinking when disabled", () => {
    const body = buildAnthropicBody({
      model: "claude-opus-4-8",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [],
      thinking: { enabled: false, budgetTokens: 0 },
      maxTokens: 1024,
    }) as any;
    expect(body.thinking).toBeUndefined();
  });
});

describe("buildAnthropicBody content mapping", () => {
  it("maps text, tool_use, and tool_result blocks", () => {
    const body = buildAnthropicBody({
      model: "claude-opus-4-8",
      messages: [
        {
          role: "assistant",
          content: [
            { type: "text", text: "let me check" },
            { type: "tool_use", tool: { id: "t1", name: "read", input: { path: "a.txt" } } },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              result: { toolUseId: "t1", content: "file body", isError: false },
            },
          ],
        },
      ],
      tools: [],
      maxTokens: 256,
    }) as any;

    expect(body.messages[0].content).toEqual([
      { type: "text", text: "let me check" },
      { type: "tool_use", id: "t1", name: "read", input: { path: "a.txt" } },
    ]);
    expect(body.messages[1].content).toEqual([
      {
        type: "tool_result",
        tool_use_id: "t1",
        content: "file body",
        is_error: false,
      },
    ]);
  });

  it("omits system when not provided and omits thinking when undefined", () => {
    const body = buildAnthropicBody({
      model: "m",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [],
      maxTokens: 10,
    }) as any;
    expect(body.system).toBeUndefined();
    expect(body.thinking).toBeUndefined();
    expect(body.max_tokens).toBe(10);
  });

  it("skips assistant thinking blocks in outbound body", () => {
    const body = buildAnthropicBody({
      model: "m",
      messages: [
        {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "internal" },
            { type: "text", text: "answer" },
          ],
        },
      ],
      tools: [],
      maxTokens: 10,
    }) as any;
    expect(body.messages[0].content).toEqual([{ type: "text", text: "answer" }]);
  });
});

describe("mapAnthropicEvent", () => {
  it("maps text_delta", () => {
    expect(
      mapAnthropicEvent("content_block_delta", {
        delta: { type: "text_delta", text: "hello" },
      }),
    ).toEqual([{ type: "text_delta", text: "hello" }]);
  });

  it("maps thinking_delta", () => {
    expect(
      mapAnthropicEvent("content_block_delta", {
        delta: { type: "thinking_delta", thinking: "pondering" },
      }),
    ).toEqual([{ type: "thinking_delta", text: "pondering" }]);
  });

  it("maps message_delta usage", () => {
    expect(
      mapAnthropicEvent("message_delta", {
        usage: { input_tokens: 5, output_tokens: 7 },
      }),
    ).toEqual([{ type: "usage", usage: { inputTokens: 5, outputTokens: 7 } }]);
  });

  it("defaults usage tokens to 0", () => {
    expect(
      mapAnthropicEvent("message_delta", { usage: {} }),
    ).toEqual([{ type: "usage", usage: { inputTokens: 0, outputTokens: 0 } }]);
  });

  it("maps message_start usage (input_tokens)", () => {
    expect(
      mapAnthropicEvent("message_start", {
        message: { usage: { input_tokens: 50, output_tokens: 1 } },
      }),
    ).toEqual([{ type: "usage", usage: { inputTokens: 50, outputTokens: 1 } }]);
  });

  it("defaults message_start usage tokens to 0", () => {
    expect(mapAnthropicEvent("message_start", { message: {} })).toEqual([
      { type: "usage", usage: { inputTokens: 0, outputTokens: 0 } },
    ]);
  });

  it("returns [] for unknown events", () => {
    expect(mapAnthropicEvent("content_block_start", {})).toEqual([]);
    expect(mapAnthropicEvent("ping", {})).toEqual([]);
    expect(mapAnthropicEvent(undefined, {})).toEqual([]);
    // message_stop is handled by stream() with the tracked snake_case
    // stop_reason, so the pure mapper no longer emits a done event for it.
    expect(mapAnthropicEvent("message_stop", {})).toEqual([]);
  });
});
