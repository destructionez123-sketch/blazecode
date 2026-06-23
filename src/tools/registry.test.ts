import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ToolRegistry, toolToSchema } from "./registry.js";
import type { Tool } from "./tool.js";

const dummy: Tool = {
  name: "echo",
  description: "echoes input",
  schema: z.object({ text: z.string() }),
  permission: "none",
  async execute(input: { text: string }) {
    return input.text;
  },
};

describe("tool registry", () => {
  it("registers and lists tools", () => {
    const reg = new ToolRegistry();
    reg.register(dummy);
    expect(reg.get("echo")).toBe(dummy);
    expect(reg.list()).toHaveLength(1);
  });
  it("produces json schema with name and description", () => {
    const schema = toolToSchema(dummy);
    expect(schema.name).toBe("echo");
    expect(schema.description).toBe("echoes input");
    expect(schema.inputSchema).toMatchObject({ type: "object" });
  });
});
