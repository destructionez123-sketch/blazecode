import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { PermissionPrompt } from "./PermissionPrompt.js";

describe("PermissionPrompt", () => {
  it("mounts and shows the request and options", () => {
    const { lastFrame } = render(
      <PermissionPrompt tool="bash" detail="rm -rf /tmp/x" onDecide={() => {}} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Allow bash?");
    expect(frame).toContain("rm -rf /tmp/x");
    expect(frame).toContain("Allow once");
    expect(frame).toContain("Allow always");
    expect(frame).toContain("Deny");
  });

  it("renders the default-highlighted option", () => {
    const { lastFrame } = render(
      <PermissionPrompt tool="bash" detail="x" onDecide={() => {}} />,
    );
    // first option is highlighted with the cursor prefix
    expect(lastFrame() ?? "").toContain("› Allow once");
  });
});
