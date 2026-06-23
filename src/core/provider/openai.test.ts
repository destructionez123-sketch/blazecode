import { describe, it, expect } from "vitest";
import { buildOpenAIBody, openaiProvider } from "./openai.js";
import type { StreamEvent } from "./types.js";

describe("buildOpenAIBody", () => {
  it("maps tools to function format and sets stream", () => {
    const body = buildOpenAIBody({
      model: "deepseek-v3.2",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [{ name: "grep", description: "search", inputSchema: { type: "object" } }],
      maxTokens: 512,
    }) as any;
    expect(body.model).toBe("deepseek-v3.2");
    expect(body.stream).toBe(true);
    expect(body.tools[0]).toEqual({
      type: "function",
      function: { name: "grep", description: "search", parameters: { type: "object" } },
    });
  });

  it("prepends system message and includes stream_options + max_tokens", () => {
    const body = buildOpenAIBody({
      model: "gpt-4o",
      system: "you are helpful",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [],
      maxTokens: 256,
    }) as any;
    expect(body.messages[0]).toEqual({ role: "system", content: "you are helpful" });
    expect(body.messages[1]).toEqual({ role: "user", content: "hi" });
    expect(body.stream_options).toEqual({ include_usage: true });
    expect(body.max_tokens).toBe(256);
  });

  it("flattens assistant tool_use into tool_calls and tool_result into tool role", () => {
    const body = buildOpenAIBody({
      model: "gpt-4o",
      messages: [
        { role: "user", content: [{ type: "text", text: "find foo" }] },
        {
          role: "assistant",
          content: [
            { type: "text", text: "searching" },
            { type: "tool_use", tool: { id: "call_1", name: "grep", input: { q: "foo" } } },
          ],
        },
        {
          role: "user",
          content: [
            { type: "tool_result", result: { toolUseId: "call_1", content: "match" } },
          ],
        },
      ],
      tools: [],
      maxTokens: 256,
    }) as any;

    expect(body.messages[0]).toEqual({ role: "user", content: "find foo" });
    expect(body.messages[1]).toEqual({
      role: "assistant",
      content: "searching",
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "grep", arguments: JSON.stringify({ q: "foo" }) },
        },
      ],
    });
    expect(body.messages[2]).toEqual({
      role: "tool",
      tool_call_id: "call_1",
      content: "match",
    });
  });
});

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) {
        controller.enqueue(enc.encode(`data: ${c}\n\n`));
      }
      controller.close();
    },
  });
}

async function collect(req: any): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const ev of openaiProvider.stream(
    req,
    "key",
    "https://api.example.com/v1",
    new AbortController().signal,
  )) {
    events.push(ev);
  }
  return events;
}

describe("openaiProvider.stream", () => {
  it("emits text_delta, accumulated tool_call, usage and done", async () => {
    const chunks = [
      JSON.stringify({ choices: [{ delta: { content: "Hel" } }] }),
      JSON.stringify({ choices: [{ delta: { content: "lo" } }] }),
      JSON.stringify({
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: "call_9", function: { name: "grep", arguments: '{"q":' } },
              ],
            },
          },
        ],
      }),
      JSON.stringify({
        choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"foo"}' } }] } }],
      }),
      JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] }),
      JSON.stringify({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
      "[DONE]",
    ];
    const orig = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(sseStream(chunks), { status: 200 })) as any;
    try {
      const events = await collect({
        model: "gpt-4o",
        messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        tools: [],
        maxTokens: 256,
      });
      expect(events).toContainEqual({ type: "text_delta", text: "Hel" });
      expect(events).toContainEqual({ type: "text_delta", text: "lo" });
      expect(events).toContainEqual({
        type: "tool_call",
        tool: { id: "call_9", name: "grep", input: { q: "foo" } },
      });
      expect(events).toContainEqual({ type: "done", stopReason: "tool_calls" });
      expect(events).toContainEqual({
        type: "usage",
        usage: { inputTokens: 10, outputTokens: 5 },
      });
      // tool_call must be flushed before done
      const toolIdx = events.findIndex((e) => e.type === "tool_call");
      const doneIdx = events.findIndex((e) => e.type === "done");
      expect(toolIdx).toBeLessThan(doneIdx);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it("yields error on non-ok response", async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("nope", { status: 401 })) as any;
    try {
      const events = await collect({
        model: "gpt-4o",
        messages: [],
        tools: [],
        maxTokens: 256,
      });
      expect(events[0]).toEqual({
        type: "error",
        message: "HTTP 401: nope",
        status: 401,
      });
    } finally {
      globalThis.fetch = orig;
    }
  });
});
