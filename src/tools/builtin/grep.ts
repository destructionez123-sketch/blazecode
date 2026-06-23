import { readFile } from "node:fs/promises";
import { z } from "zod";
import picomatch from "picomatch";
import type { Tool } from "../tool.js";
import { walkFiles, toRelPosix } from "./walk.js";

const MAX_MATCHES = 200;

const schema = z.object({
  pattern: z.string(),
  include: z.string().optional(),
});

export const grepTool: Tool<{ pattern: string; include?: string }> = {
  name: "grep",
  description:
    "Search file contents for a regex. Returns 'relpath:lineno: line' matches (capped at 200).",
  schema,
  permission: "none",
  async execute({ pattern, include }, ctx) {
    let re: RegExp;
    try {
      re = new RegExp(pattern);
    } catch {
      return `Invalid regex: ${pattern}`;
    }
    const includeMatch = include ? picomatch(include) : undefined;
    const results: string[] = [];

    for await (const full of walkFiles(ctx.cwd)) {
      const rel = toRelPosix(ctx.cwd, full);
      if (includeMatch && !includeMatch(rel)) continue;

      let text: string;
      try {
        text = await readFile(full, "utf8");
      } catch {
        continue;
      }

      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          results.push(`${rel}:${i + 1}: ${lines[i]}`);
          if (results.length >= MAX_MATCHES) return results.join("\n");
        }
      }
    }
    return results.join("\n");
  },
};
