import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { Transcript, type TranscriptItem } from "./Transcript.js";

describe("Transcript", () => {
  it("renders a user item and an error item", () => {
    const items: TranscriptItem[] = [
      { kind: "user", text: "hello there" },
      { kind: "error", message: "something broke" },
    ];
    const { lastFrame } = render(<Transcript items={items} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("hello there");
    expect(frame).toContain("something broke");
    expect(frame).toContain("✗");
  });

  it("renders a tool item via ToolCard", () => {
    const items: TranscriptItem[] = [
      { kind: "tool", name: "read_file", input: { path: "src/a.ts" }, output: "file contents" },
    ];
    const { lastFrame } = render(<Transcript items={items} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("read_file");
    // One-line collapsed cards surface the input detail, not the full output.
    expect(frame).toContain("src/a.ts");
    expect(frame).toContain("✓");
  });

  it("renders an info item", () => {
    const items: TranscriptItem[] = [{ kind: "info", text: "No agents configured." }];
    const { lastFrame } = render(<Transcript items={items} />);
    expect(lastFrame() ?? "").toContain("No agents configured.");
  });
});
