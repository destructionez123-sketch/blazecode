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

    // Fast path: exact literal match (preserves prior behaviour for files
    // that already match exactly, including their EOL style).
    const count = text.split(oldString).length - 1;
    if (count > 1 && !replaceAll)
      throw new Error("Found multiple matches; provide more context or set replaceAll");
    if (count >= 1) {
      const next = replaceAll
        ? text.split(oldString).join(newString)
        : text.replace(oldString, newString);
      await writeFile(full, next);
      return `Edited ${path}`;
    }

    // Fallback: the literal match found nothing. On Windows the file may use
    // \r\n while the model supplied oldString with \n. Retry by normalizing
    // both sides to \n, then write back preserving the file's original EOL.
    const usesCrlf = text.includes("\r\n");
    const normText = text.replace(/\r\n/g, "\n");
    const normOld = oldString.replace(/\r\n/g, "\n");
    const normNew = newString.replace(/\r\n/g, "\n");
    const normCount = normText.split(normOld).length - 1;
    if (normCount === 0) throw new Error("oldString not found in content");
    if (normCount > 1 && !replaceAll)
      throw new Error("Found multiple matches; provide more context or set replaceAll");
    const normNext = replaceAll
      ? normText.split(normOld).join(normNew)
      : normText.replace(normOld, normNew);
    const out = usesCrlf ? normNext.replace(/\n/g, "\r\n") : normNext;
    await writeFile(full, out);
    return `Edited ${path}`;
  },
};
