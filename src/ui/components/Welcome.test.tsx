import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { Welcome } from "./Welcome.js";

describe("Welcome", () => {
  it("renders the mascot name and an example prompt", () => {
    const { lastFrame } = render(<Welcome model="claude-opus-4-8" cwd="/proj/blaze" />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Blaze");
    expect(frame).toContain("refactor the auth module and run the tests");
  });

  it("mentions the working directory basename", () => {
    const { lastFrame } = render(<Welcome model="m" cwd="/home/user/myrepo" />);
    expect(lastFrame() ?? "").toContain("myrepo");
  });
});
