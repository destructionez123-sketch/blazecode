import { readdir, readFile } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import matter from "gray-matter";
import { configDir } from "../config/paths.js";
import { ToolRegistry } from "../tools/registry.js";
import { createEngine } from "../core/engine.js";
import { Session } from "../core/session.js";
import { EventBus } from "../core/events.js";
import { selectProvider } from "../core/provider/select.js";
import type { Provider } from "../core/provider/types.js";
import type { PermissionManager } from "../permissions/manager.js";
import type { BlazeConfig } from "../config/schema.js";
import type { Tool } from "../tools/tool.js";
import { z } from "zod";

type PermissionOverride = Partial<{
  bash: "ask" | "allow";
  write: "ask" | "allow";
  edit: "ask" | "allow";
}>;

export interface Agent {
  name: string;
  model?: string;
  tools?: string[];
  permission?: PermissionOverride;
  prompt: string;
}

async function scanDir(root: string): Promise<Agent[]> {
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return [];
  }
  const agents: Agent[] = [];
  for (const entry of entries) {
    if (extname(entry) !== ".md") continue;
    const full = join(root, entry);
    const raw = await readFile(full, "utf8");
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;
    agents.push({
      name:
        typeof fm.name === "string" ? fm.name : basename(entry, extname(entry)),
      model: typeof fm.model === "string" ? fm.model : undefined,
      tools: Array.isArray(fm.tools)
        ? (fm.tools as unknown[]).map(String)
        : undefined,
      permission:
        fm.permission && typeof fm.permission === "object"
          ? (fm.permission as PermissionOverride)
          : undefined,
      prompt: parsed.content.trim(),
    });
  }
  return agents;
}

export async function discoverAgents(cwd: string): Promise<Agent[]> {
  const project = await scanDir(join(cwd, ".blaze", "agents"));
  const global = await scanDir(join(configDir(), "agents"));
  return [...project, ...global];
}

export interface TaskToolDeps {
  agents: Agent[];
  baseRegistry: ToolRegistry;
  permissions: PermissionManager;
  config: BlazeConfig;
  key: string;
  cwd: string;
  providerFactory?: (model: string) => Provider;
}

const taskInputSchema = z.object({
  subagent_type: z.string(),
  description: z.string(),
  prompt: z.string(),
});

type TaskInput = z.infer<typeof taskInputSchema>;

function lastAssistantText(session: Session): string {
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const msg = session.messages[i];
    if (msg.role !== "assistant") continue;
    const text = msg.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");
    return text || "(no output)";
  }
  return "(no output)";
}

export function createTaskTool(deps: TaskToolDeps): Tool<TaskInput> {
  const {
    agents,
    baseRegistry,
    permissions,
    config,
    key,
    cwd,
    providerFactory = selectProvider,
  } = deps;

  return {
    name: "task",
    description:
      "Dispatch a subagent (persona) to perform a focused task and return its final output.",
    schema: taskInputSchema,
    permission: "none",
    async execute(input: TaskInput): Promise<string> {
      const agent = agents.find((a) => a.name === input.subagent_type);
      if (!agent) {
        return `Unknown agent: ${input.subagent_type}`;
      }

      // Build a filtered registry for the subagent. Never include "task"
      // (infinite recursion guard).
      const filtered = new ToolRegistry();
      const allowed = agent.tools;
      for (const tool of baseRegistry.list()) {
        if (tool.name === "task") continue;
        if (allowed !== undefined && !allowed.includes(tool.name)) continue;
        filtered.register(tool);
      }

      const subConfig: BlazeConfig = {
        ...config,
        model: agent.model ?? config.model,
        permission: { ...config.permission, ...(agent.permission ?? {}) },
      };

      const session = new Session(`subagent-${Date.now()}`);
      const bus = new EventBus();
      const provider = providerFactory(subConfig.model);

      const subEngine = createEngine({
        provider,
        session,
        bus,
        tools: filtered,
        permissions,
        config: subConfig,
        key,
        cwd,
        system: agent.prompt,
      });

      await subEngine.run(input.prompt, new AbortController().signal);
      return lastAssistantText(session);
    },
  };
}
