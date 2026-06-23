import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import type { Tool } from "../tool.js";

const schema = z.object({ path: z.string() });

export const readTool: Tool<{ path: string }> = {
  name: "read",
  description: "Read a file. Returns contents prefixed with line numbers.",
  schema,
  permission: "none",
  async execute({ path }, ctx) {
    const full = isAbsolute(path) ? path : join(ctx.cwd, path);
    const text = await readFile(full, "utf8");
    return text
      .split("\n")
      .map((line, i) => `${i + 1}: ${line}`)
      .join("\n");
  },
};
