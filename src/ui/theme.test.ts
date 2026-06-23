import { describe, it, expect } from "vitest";
import { formatTokens, theme, gradientChars, FIRE_GRADIENT } from "./theme.js";

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

describe("gradientChars", () => {
  it("maps each character to a gradient stop", () => {
    const result = gradientChars("blaze");
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.char).join("")).toBe("blaze");
    expect(result[0]!.color).toBe(FIRE_GRADIENT[0]);
    expect(result[result.length - 1]!.color).toBe(
      FIRE_GRADIENT[FIRE_GRADIENT.length - 1],
    );
  });
  it("handles a single character without dividing by zero", () => {
    const result = gradientChars("x");
    expect(result).toHaveLength(1);
    expect(result[0]!.color).toBe(FIRE_GRADIENT[0]);
  });
});
