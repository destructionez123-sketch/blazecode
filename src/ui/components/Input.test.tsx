import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { Input } from "./Input.js";

describe("Input", () => {
  it("mounts with a flame prefix and placeholder", () => {
    const { lastFrame } = render(<Input onSubmit={() => {}} placeholder="type here" />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("›");
    expect(frame).toContain("type here");
  });
});
