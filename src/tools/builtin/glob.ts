import { z } from "zod";
import picomatch from "picomatch";
import type { Tool } from "../tool.js";
import { walkFiles, toRelPosix } from "./walk.js";

const schema = z.object({ pattern: z.string() });

const MAX_RESULTS = 1000;

export const globTool: Tool<{ pattern: string }> = {
  name: "glob",
  description:
    "Find files matching a glob pattern. Returns newline-joined relative paths.",
  schema,
  permission: "none",
  async execute({ pattern }, ctx) {
    const isMatch = picomatch(pattern);
    const matches: string[] = [];
    for await (const full of walkFiles(ctx.cwd)) {
      const rel = toRelPosix(ctx.cwd, full);
      if (isMatch(rel)) {
        matches.push(rel);
        if (matches.length >= MAX_RESULTS) break;
      }
    }
    return matches.join("\n");
  },
};
