import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { ToolCard, toolDetail, summarizeOutput } from "./ToolCard.js";

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

describe("summarizeOutput", () => {
  it("returns 'failed' on error", () => {
    expect(summarizeOutput("bash", "anything", true)).toBe("failed");
  });
  it("returns empty string while running (undefined output)", () => {
    expect(summarizeOutput("bash", undefined, false)).toBe("");
  });
  it("summarizes bash with exit ok and line count", () => {
    expect(summarizeOutput("bash", "a\nb\nc", false)).toBe("exit ok · 3 lines");
  });
  it("summarizes read with a line count", () => {
    expect(summarizeOutput("read", "l1\nl2", false)).toBe("2 lines");
  });
  it("shows a single-line snippet for short single-line output", () => {
    expect(summarizeOutput("grep", "found it", false)).toBe("found it");
  });
  it("truncates a long single line to ~30 chars", () => {
    const out = summarizeOutput("grep", "x".repeat(80), false);
    expect(out.length).toBeLessThanOrEqual(30);
    expect(out.endsWith("…")).toBe(true);
  });
  it("uses line count for multi-line non-bash/read output", () => {
    expect(summarizeOutput("other", "1\n2\n3\n4", false)).toBe("4 lines");
  });
});
