import { describe, it, expect } from "vitest";
import { selectProvider } from "./select.js";

describe("selectProvider", () => {
  it("uses anthropic for claude models", () => {
    expect(selectProvider("claude-opus-4-8").name).toBe("anthropic");
  });
  it("uses openai for everything else", () => {
    expect(selectProvider("deepseek-v3.2").name).toBe("openai");
    expect(selectProvider("glm-5.1").name).toBe("openai");
  });
});
