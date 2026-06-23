import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigSchema, type BlazeConfig } from "./schema.js";
import { globalConfigPath } from "./paths.js";

export const DEFAULT_CONFIG: BlazeConfig = {
  model: "claude-opus-4-8",
  baseUrl: "https://api.blazeapi.org/paid/v1",
  thinking: { enabled: true, budgetTokens: 4000 },
  permission: { bash: "ask", write: "ask", edit: "ask" },
  mcpServers: {},
  theme: "blaze",
};

export function mergeConfig(...parts: Partial<BlazeConfig>[]): BlazeConfig {
  return parts.reduce<BlazeConfig>(
    (acc, part) => ({ ...acc, ...part }) as BlazeConfig,
    DEFAULT_CONFIG,
  );
}

async function readJsonIfExists(path: string): Promise<Partial<BlazeConfig>> {
  try {
    const raw = await readFile(path, "utf8");
    return ConfigSchema.partial().parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function loadConfig(cwd: string): Promise<BlazeConfig> {
  const global = await readJsonIfExists(globalConfigPath());
  const project = await readJsonIfExists(join(cwd, "blaze.json"));
  const envOverrides: Partial<BlazeConfig> = {};
  if (process.env.BLAZE_MODEL) envOverrides.model = process.env.BLAZE_MODEL;
  return mergeConfig(global, project, envOverrides);
}
