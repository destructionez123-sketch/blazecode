import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { z } from "zod";
import type { Tool } from "../tool.js";

const schema = z.object({
  path: z.string(),
  content: z.string(),
});

export const writeTool: Tool<z.infer<typeof schema>> = {
  name: "write",
  description: "Write content to a file, creating directories as needed.",
  schema,
  permission: "write",
  async execute({ path, content }, ctx) {
    const full = isAbsolute(path) ? path : join(ctx.cwd, path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
    return `Wrote ${path}`;
  },
};
