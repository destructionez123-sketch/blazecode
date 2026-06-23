import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import type { Tool } from "../tool.js";

const schema = z.object({
  path: z.string(),
  oldString: z.string(),
  newString: z.string(),
  replaceAll: z.boolean().optional(),
});

export const editTool: Tool<z.infer<typeof schema>> = {
  name: "edit",
  description: "Replace an exact string in a file.",
  schema,
  permission: "edit",
  async execute({ path, oldString, newString, replaceAll }, ctx) {
    const full = isAbsolute(path) ? path : join(ctx.cwd, path);
    const text = await readFile(full, "utf8");
    const count = text.split(oldString).length - 1;
    if (count === 0) throw new Error("oldString not found in content");
    if (count > 1 && !replaceAll)
      throw new Error("Found multiple matches; provide more context or set replaceAll");
    const next = replaceAll ? text.split(oldString).join(newString) : text.replace(oldString, newString);
    await writeFile(full, next);
    return `Edited ${path}`;
  },
};
