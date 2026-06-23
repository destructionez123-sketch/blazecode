import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { Tool } from "../tool.js";

const run = promisify(exec);
const schema = z.object({ command: z.string(), timeout: z.number().optional() });

export const bashTool: Tool<z.infer<typeof schema>> = {
  name: "bash",
  description: "Run a shell command and return its output.",
  schema,
  permission: "bash",
  async execute({ command, timeout }, ctx) {
    try {
      const { stdout, stderr } = await run(command, {
        cwd: ctx.cwd,
        timeout: timeout ?? 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return [stdout, stderr].filter(Boolean).join("\n") || "(no output)";
    } catch (err: any) {
      return `Command failed: ${err.message}\n${err.stdout ?? ""}${err.stderr ?? ""}`;
    }
  },
};
