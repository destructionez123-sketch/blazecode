import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, mergeConfig } from "./load.js";

describe("config merge", () => {
  it("defaults have premium base url and a claude model", () => {
    expect(DEFAULT_CONFIG.baseUrl).toBe("https://api.blazeapi.org/paid/v1");
    expect(DEFAULT_CONFIG.model.startsWith("claude-")).toBe(true);
  });
  it("later parts override earlier ones", () => {
    const merged = mergeConfig(DEFAULT_CONFIG, { model: "deepseek-v3.2" });
    expect(merged.model).toBe("deepseek-v3.2");
    expect(merged.baseUrl).toBe(DEFAULT_CONFIG.baseUrl);
  });
  it("thinking on by default", () => {
    expect(DEFAULT_CONFIG.thinking.enabled).toBe(true);
  });
});
