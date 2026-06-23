import { describe, it, expect } from "vitest";
import { parseSSE } from "./sse.js";

function streamFrom(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("parseSSE", () => {
  it("parses event + data pairs", async () => {
    const raw = "event: ping\ndata: {\"a\":1}\n\nevent: done\ndata: [DONE]\n\n";
    const out: Array<{ event?: string; data: string }> = [];
    for await (const e of parseSSE(streamFrom(raw))) out.push(e);
    expect(out[0]).toEqual({ event: "ping", data: '{"a":1}' });
    expect(out[1]).toEqual({ event: "done", data: "[DONE]" });
  });
});
