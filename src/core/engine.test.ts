import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createEngine } from "./engine.js";
import { Session } from "./session.js";
import { EventBus } from "./events.js";
import { ToolRegistry } from "../tools/registry.js";
import { createPermissionManager } from "../permissions/manager.js";
import type { Provider, StreamEvent } from "./provider/types.js";
import { DEFAULT_CONFIG } from "../config/load.js";

function fakeProvider(scripts: StreamEvent[][]): Provider {
  let turn = 0;
  return {
    name: "anthropic",
    async *stream() {
      const events = scripts[turn++] ?? [{ type: "done", stopReason: "end_turn" }];
      for (const e of events) yield e;
    },
  };
}

// A provider that ALWAYS emits a tool_call + done, never finishing.
function infiniteToolProvider(): Provider {
  return {
    name: "anthropic",
    async *stream() {
      yield { type: "tool_call", tool: { id: "t", name: "echo", input: { text: "x" } } };
      yield { type: "done", stopReason: "tool_use" };
    },
  };
}

describe("engine", () => {
  it("executes a tool then finishes", async () => {
    const reg = new ToolRegistry();
    reg.register({
      name: "echo",
      description: "echo",
      schema: z.object({ text: z.string() }),
      permission: "none",
      execute: async (i: any) => `echoed:${i.text}`,
    });
    const provider = fakeProvider([
      [
        { type: "tool_call", tool: { id: "t1", name: "echo", input: { text: "hi" } } },
        { type: "done", stopReason: "tool_use" },
      ],
      [
        { type: "text_delta", text: "all done" },
        { type: "done", stopReason: "end_turn" },
      ],
    ]);
    const bus = new EventBus();
    const events: string[] = [];
    bus.on((e) => events.push(e.type));
    const engine = createEngine({
      provider,
      session: new Session("t"),
      bus,
      tools: reg,
      permissions: createPermissionManager(async () => "allow_once"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      system: "sys",
    });
    await engine.run("do it", new AbortController().signal);
    expect(events).toContain("tool_start");
    expect(events).toContain("tool_end");
    expect(events).toContain("turn_end");
  });

  it("denies a tool when permission check returns deny", async () => {
    const reg = new ToolRegistry();
    let executed = false;
    reg.register({
      name: "shell",
      description: "run shell",
      schema: z.object({ cmd: z.string() }),
      permission: "bash",
      execute: async () => {
        executed = true;
        return "ran";
      },
    });
    const provider = fakeProvider([
      [
        { type: "tool_call", tool: { id: "t1", name: "shell", input: { cmd: "ls" } } },
        { type: "done", stopReason: "tool_use" },
      ],
      [
        { type: "text_delta", text: "ok" },
        { type: "done", stopReason: "end_turn" },
      ],
    ]);
    const bus = new EventBus();
    const ends: Array<{ output: string; isError: boolean }> = [];
    bus.on((e) => {
      if (e.type === "tool_end") ends.push({ output: e.output, isError: e.isError });
    });
    const session = new Session("t");
    const engine = createEngine({
      provider,
      session,
      bus,
      tools: reg,
      permissions: createPermissionManager(async () => "deny"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      system: "sys",
    });
    await engine.run("run ls", new AbortController().signal);
    expect(executed).toBe(false);
    expect(ends).toHaveLength(1);
    expect(ends[0].isError).toBe(true);
    expect(ends[0].output).toBe("User denied permission");
  });

  it("captures a usage event that arrives after done", async () => {
    const reg = new ToolRegistry();
    const provider = fakeProvider([
      [
        { type: "text_delta", text: "hello" },
        { type: "done", stopReason: "end_turn" },
        { type: "usage", usage: { inputTokens: 10, outputTokens: 5 } },
      ],
    ]);
    const bus = new EventBus();
    const usageEvents: Array<{ inputTokens: number; outputTokens: number }> = [];
    bus.on((e) => {
      if (e.type === "usage")
        usageEvents.push({ inputTokens: e.inputTokens, outputTokens: e.outputTokens });
    });
    const session = new Session("t");
    const engine = createEngine({
      provider,
      session,
      bus,
      tools: reg,
      permissions: createPermissionManager(async () => "allow_once"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      system: "sys",
    });
    await engine.run("hi", new AbortController().signal);
    expect(usageEvents).toEqual([{ inputTokens: 10, outputTokens: 5 }]);
    expect(session.inputTokens).toBe(10);
    expect(session.outputTokens).toBe(5);
  });

  it("terminates after max iterations when the model never finishes", async () => {
    const reg = new ToolRegistry();
    reg.register({
      name: "echo",
      description: "echo",
      schema: z.object({ text: z.string() }),
      permission: "none",
      execute: async (i: any) => `echoed:${i.text}`,
    });
    const bus = new EventBus();
    const errors: string[] = [];
    bus.on((e) => {
      if (e.type === "error") errors.push(e.message);
    });
    const engine = createEngine({
      provider: infiniteToolProvider(),
      session: new Session("t"),
      bus,
      tools: reg,
      permissions: createPermissionManager(async () => "allow_once"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      system: "sys",
    });
    // Must terminate (not hang) and emit an error mentioning the limit.
    await engine.run("loop forever", new AbortController().signal);
    expect(errors.some((m) => /maximum tool iterations \(50\)/.test(m))).toBe(true);
  });

  it("produces an isError tool_result for invalid tool input without throwing", async () => {
    const reg = new ToolRegistry();
    let executed = false;
    reg.register({
      name: "needspath",
      description: "needs a path",
      schema: z.object({ path: z.string() }),
      permission: "none",
      execute: async () => {
        executed = true;
        return "ran";
      },
    });
    // First turn: tool_call with missing required `path`. Second turn finishes.
    const provider = fakeProvider([
      [
        { type: "tool_call", tool: { id: "t1", name: "needspath", input: {} } },
        { type: "done", stopReason: "tool_use" },
      ],
      [
        { type: "text_delta", text: "ok" },
        { type: "done", stopReason: "end_turn" },
      ],
    ]);
    const bus = new EventBus();
    const ends: Array<{ output: string; isError: boolean }> = [];
    bus.on((e) => {
      if (e.type === "tool_end") ends.push({ output: e.output, isError: e.isError });
    });
    const engine = createEngine({
      provider,
      session: new Session("t"),
      bus,
      tools: reg,
      permissions: createPermissionManager(async () => "allow_once"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      system: "sys",
    });
    await engine.run("call it", new AbortController().signal);
    expect(executed).toBe(false);
    expect(ends).toHaveLength(1);
    expect(ends[0].isError).toBe(true);
    expect(ends[0].output).toMatch(/Invalid tool input/);
    expect(ends[0].output).toMatch(/path/);
  });
});
