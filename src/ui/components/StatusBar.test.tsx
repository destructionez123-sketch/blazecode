import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { StatusBar } from "./StatusBar.js";

describe("StatusBar", () => {
  it("shows model and compact token totals", () => {
    const { lastFrame } = render(
      <StatusBar model="claude-opus-4-8" inputTokens={1_200_000} outputTokens={4200} cwd="/proj" />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("claude-opus-4-8");
    expect(frame).toContain("1.2M");
    expect(frame).toContain("4.2K");
  });
});
