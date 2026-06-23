import { describe, it, expect, beforeAll, vi } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { discoverAgents, createTaskTool, type Agent } from "./agents.js";
import { ToolRegistry } from "../tools/registry.js";
import { createPermissionManager } from "../permissions/manager.js";
import { DEFAULT_CONFIG } from "../config/load.js";
import type { Provider, StreamEvent } from "../core/provider/types.js";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "blaze-agents-"));
  const aDir = join(dir, ".blaze", "agents");
  await mkdir(aDir, { recursive: true });
  await writeFile(
    join(aDir, "reviewer.md"),
    "---\nname: reviewer\nmodel: claude-opus-4-8\ntools: [read, grep]\n---\nYou review code.",
  );
});

describe("discoverAgents", () => {
  it("loads agent personas with frontmatter and prompt", async () => {
    const agents = await discoverAgents(dir);
    const r = agents.find((a) => a.name === "reviewer");
    expect(r?.model).toBe("claude-opus-4-8");
    expect(r?.tools).toEqual(["read", "grep"]);
    expect(r?.prompt).toContain("You review code");
  });

  it("skips an agent with malformed frontmatter and keeps the valid ones", async () => {
    const bad = await mkdtemp(join(tmpdir(), "blaze-agents-bad-"));
    const aDir = join(bad, ".blaze", "agents");
    await mkdir(aDir, { recursive: true });
    await writeFile(
      join(aDir, "ok.md"),
      "---\nname: ok\n---\nYou are fine.",
    );
    await writeFile(
      join(aDir, "broken.md"),
      "---\nname: [unclosed\n---\nbroken body",
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let agents: Agent[] = [];
    await expect(
      (async () => {
        agents = await discoverAgents(bad);
      })(),
    ).resolves.not.toThrow();
    expect(agents.find((a) => a.name === "ok")).toBeTruthy();
    expect(agents.find((a) => a.name === "broken")).toBeFalsy();
    expect(spy.mock.calls.map((c) => String(c[0])).join("\n")).toContain(
      "[agents]",
    );
    spy.mockRestore();
  });
});

function fakeProvider(scripts: StreamEvent[][]): Provider {
  let turn = 0;
  return {
    name: "anthropic",
    async *stream() {
      const events =
        scripts[turn++] ?? [{ type: "done", stopReason: "end_turn" }];
      for (const e of events) yield e;
    },
  };
}

describe("createTaskTool", () => {
  it("runs a subagent and returns its final assistant text", async () => {
    const agents: Agent[] = [
      { name: "writer", tools: [], prompt: "You are a writer." },
    ];
    const baseRegistry = new ToolRegistry();
    baseRegistry.register({
      name: "read",
      description: "read",
      schema: z.object({ path: z.string() }),
      permission: "none",
      execute: async () => "file contents",
    });
    const tool = createTaskTool({
      agents,
      baseRegistry,
      permissions: createPermissionManager(async () => "allow_once"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      providerFactory: () =>
        fakeProvider([
          [
            { type: "text_delta", text: "subagent reply" },
            { type: "done", stopReason: "end_turn" },
          ],
        ]),
    });
    const out = await tool.execute(
      { subagent_type: "writer", description: "d", prompt: "go" },
      { cwd: process.cwd() },
    );
    expect(out).toBe("subagent reply");
  });

  it("returns Unknown agent message when agent not found", async () => {
    const tool = createTaskTool({
      agents: [],
      baseRegistry: new ToolRegistry(),
      permissions: createPermissionManager(async () => "allow_once"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      providerFactory: () => fakeProvider([]),
    });
    const out = await tool.execute(
      { subagent_type: "nope", description: "d", prompt: "go" },
      { cwd: process.cwd() },
    );
    expect(out).toBe("Unknown agent: nope");
  });

  it("never registers the task tool into the subagent registry (recursion guard)", async () => {
    let capturedTools: string[] = [];
    const agents: Agent[] = [
      { name: "explorer", prompt: "Explore." }, // tools undefined -> all except task
    ];
    const baseRegistry = new ToolRegistry();
    baseRegistry.register({
      name: "read",
      description: "read",
      schema: z.object({ path: z.string() }),
      permission: "none",
      execute: async () => "ok",
    });
    baseRegistry.register({
      name: "task",
      description: "task",
      schema: z.object({ subagent_type: z.string() }),
      permission: "none",
      execute: async () => "should never run",
    });
    const tool = createTaskTool({
      agents,
      baseRegistry,
      permissions: createPermissionManager(async () => "allow_once"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      providerFactory: () => ({
        name: "anthropic",
        async *stream(req) {
          capturedTools = req.tools.map((t) => t.name);
          yield { type: "text_delta", text: "done" };
          yield { type: "done", stopReason: "end_turn" };
        },
      }),
    });
    await tool.execute(
      { subagent_type: "explorer", description: "d", prompt: "go" },
      { cwd: process.cwd() },
    );
    expect(capturedTools).toContain("read");
    expect(capturedTools).not.toContain("task");
  });
});
