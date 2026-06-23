import { describe, it, expect } from "vitest";
import { formatTokens, theme } from "./theme.js";

describe("ui theme helpers", () => {
  it("formats tokens compactly", () => {
    expect(formatTokens(1_200_000)).toBe("1.2M");
    expect(formatTokens(4200)).toBe("4.2K");
    expect(formatTokens(42)).toBe("42");
  });
  it("has a flame color", () => {
    expect(theme.flame).toMatch(/^#/);
  });
});
