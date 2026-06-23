import { describe, it, expect } from "vitest";
import { bashTool } from "./bash.js";

describe("bash tool", () => {
  it("runs a command and captures output", async () => {
    const out = await bashTool.execute({ command: "echo blazetest" }, { cwd: process.cwd() });
    expect(out).toContain("blazetest");
  });
});
