import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./prompt.js";

describe("buildSystemPrompt", () => {
  it("lists skills and cwd", () => {
    const p = buildSystemPrompt({
      cwd: "/proj",
      skills: [{ name: "demo", description: "d", body: "", path: "" }],
      agents: [],
    });
    expect(p).toContain("/proj");
    expect(p).toContain("demo");
  });

  it("lists agent names when agents are non-empty", () => {
    const p = buildSystemPrompt({
      cwd: "/proj",
      skills: [],
      agents: [{ name: "researcher", prompt: "do research" }],
    });
    expect(p).toContain("researcher");
  });
});
