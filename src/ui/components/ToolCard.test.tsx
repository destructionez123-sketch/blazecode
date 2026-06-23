import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { ToolCard, toolDetail } from "./ToolCard.js";

describe("toolDetail", () => {
  it("picks path", () => {
    expect(toolDetail({ path: "src/a.ts" })).toBe("src/a.ts");
  });
  it("picks command when no path", () => {
    expect(toolDetail({ command: "npm test" })).toBe("npm test");
  });
  it("picks pattern then url as fallbacks", () => {
    expect(toolDetail({ pattern: "**/*.ts" })).toBe("**/*.ts");
    expect(toolDetail({ url: "https://x.dev" })).toBe("https://x.dev");
  });
  it("truncates long values to ~50 chars", () => {
    const long = "a".repeat(80);
    const out = toolDetail({ path: long });
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith("…")).toBe(true);
  });
  it("returns empty string for non-objects", () => {
    expect(toolDetail(null)).toBe("");
    expect(toolDetail("nope")).toBe("");
  });
});

describe("ToolCard", () => {
  it("renders the name, the detail, and a done glyph", () => {
    const { lastFrame } = render(
      <ToolCard name="read" input={{ path: "src/auth.ts" }} output="contents" />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("read");
    expect(frame).toContain("src/auth.ts");
    expect(frame).toContain("✓");
  });

  it("shows a running glyph when output is undefined", () => {
    const { lastFrame } = render(<ToolCard name="bash" input={{ command: "npm test" }} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("npm test");
    expect(frame).toContain("•");
  });

  it("shows an error glyph when isError", () => {
    const { lastFrame } = render(
      <ToolCard name="bash" input={{ command: "boom" }} output="err" isError />,
    );
    expect(lastFrame() ?? "").toContain("✗");
  });
});
