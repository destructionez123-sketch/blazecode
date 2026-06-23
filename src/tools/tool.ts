import type { z } from "zod";

export interface ToolContext {
  cwd: string;
}

export interface Tool<I = any> {
  name: string;
  description: string;
  schema: z.ZodType<I>;
  permission: "none" | "bash" | "write" | "edit";
  execute(input: I, ctx: ToolContext): Promise<string>;
}
