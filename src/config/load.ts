import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  PartialConfigSchema,
  type BlazeConfig,
  type PartialBlazeConfig,
} from "./schema.js";
import { globalConfigPath } from "./paths.js";

export const DEFAULT_CONFIG: BlazeConfig = {
  model: "claude-opus-4-8",
  baseUrl: "https://api.blazeapi.org/paid/v1",
  thinking: { enabled: true, budgetTokens: 4000 },
  permission: { bash: "ask", write: "ask", edit: "ask" },
  mcpServers: {},
  theme: "blaze",
};

export function mergeConfig(...parts: PartialBlazeConfig[]): BlazeConfig {
  return parts.reduce<BlazeConfig>((acc, part) => {
    return {
      ...acc,
      ...part,
      // Deep-merge nested objects so a partial override (e.g. only
      // `thinking.enabled`) preserves sibling keys from earlier parts.
      thinking: { ...acc.thinking, ...part.thinking },
      permission: { ...acc.permission, ...part.permission },
      // Shallow-merge MCP servers by key so each part contributes its servers.
      mcpServers: { ...acc.mcpServers, ...part.mcpServers },
    };
  }, DEFAULT_CONFIG);
}

async function readJsonIfExists(path: string): Promise<PartialBlazeConfig> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    // Missing (or unreadable) file: no override, no warning.
    return {};
  }
  // The file is present, so a parse/validation failure is worth surfacing
  // instead of silently ignoring the user's configuration.
  try {
    return PartialConfigSchema.parse(JSON.parse(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[config] ignoring invalid ${path}: ${message}`);
    return {};
  }
}

export async function loadConfig(cwd: string): Promise<BlazeConfig> {
  const global = await readJsonIfExists(globalConfigPath());
  const project = await readJsonIfExists(join(cwd, "blaze.json"));
  const envOverrides: PartialBlazeConfig = {};
  if (process.env.BLAZE_MODEL) envOverrides.model = process.env.BLAZE_MODEL;
  return mergeConfig(global, project, envOverrides);
}
