import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import matter from "gray-matter";
import { configDir } from "../config/paths.js";
import type { Tool } from "../tools/tool.js";

export interface Skill {
  name: string;
  description: string;
  body: string;
  path: string;
}

async function scanRoot(root: string): Promise<Skill[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const skills: Skill[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = join(root, entry.name, "SKILL.md");
    try {
      const raw = await readFile(skillPath, "utf8");
      const parsed = matter(raw);
      const fm = parsed.data as { name?: string; description?: string };
      skills.push({
        name: fm.name ?? entry.name,
        description: fm.description ?? "",
        body: parsed.content,
        path: skillPath,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[skills] skipping ${skillPath}: ${message}`);
      continue;
    }
  }
  return skills;
}

export async function discoverSkills(cwd: string): Promise<Skill[]> {
  const projectRoot = join(cwd, ".blaze", "skills");
  const globalRoot = join(configDir(), "skills");
  const project = await scanRoot(projectRoot);
  const global = await scanRoot(globalRoot);
  return [...project, ...global];
}

const skillInputSchema = z.object({ name: z.string() });
type SkillInput = z.infer<typeof skillInputSchema>;

export function createSkillTool(skills: Skill[]): Tool<SkillInput> {
  return {
    name: "skill",
    description: "Load a skill's instructions by name.",
    schema: skillInputSchema,
    permission: "none",
    async execute({ name }) {
      const match = skills.find((s) => s.name === name);
      if (!match) return `Skill not found: ${name}`;
      return match.body;
    },
  };
}
