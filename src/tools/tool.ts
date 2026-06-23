import type { z } from "zod";

export interface ToolContext {
  cwd: string;
}

export interface Tool<I = any> {
  name: string;
  description: string;
  schema: z.ZodType<I>;
  /**
   * Optional pre-built JSON Schema for the tool's input. When present this
   * overrides the schema derived from `schema` via zodToJsonSchema. Used by
   * bridged MCP tools whose real input schema is already a JSON Schema object.
   */
  jsonSchema?: Record<string, unknown>;
  permission: "none" | "bash" | "write" | "edit";
  execute(input: I, ctx: ToolContext): Promise<string>;
}
