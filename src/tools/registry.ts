import { zodToJsonSchema } from "zod-to-json-schema";
import type { ToolSchema } from "../core/provider/types.js";
import type { Tool } from "./tool.js";

export function toolToSchema(tool: Tool): ToolSchema {
  let json: Record<string, unknown>;
  if (tool.jsonSchema) {
    json = { ...tool.jsonSchema };
  } else {
    json = zodToJsonSchema(tool.schema, { target: "openApi3" }) as Record<
      string,
      unknown
    >;
  }
  delete (json as any).$schema;
  return { name: tool.name, description: tool.description, inputSchema: json };
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  list(): Tool[] {
    return [...this.tools.values()];
  }
  schemas(): ToolSchema[] {
    return this.list().map(toolToSchema);
  }
}
