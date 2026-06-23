import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { ThinkingPanel } from "./ThinkingPanel.js";

describe("ThinkingPanel", () => {
  it("renders nothing when text is empty", () => {
    const { lastFrame } = render(<ThinkingPanel text="" collapsed={false} />);
    expect(lastFrame() ?? "").toBe("");
  });

  it("shows a hint when collapsed", () => {
    const { lastFrame } = render(<ThinkingPanel text="some reasoning" collapsed={true} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("thinking (ctrl+t to expand)");
    expect(frame).not.toContain("some reasoning");
  });

  it("shows the thinking text when expanded", () => {
    const { lastFrame } = render(<ThinkingPanel text="some reasoning" collapsed={false} />);
    expect(lastFrame() ?? "").toContain("some reasoning");
  });
});
