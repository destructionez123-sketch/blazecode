import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { StatusLine } from "./StatusLine.js";
import { FACES } from "../mascot.js";

describe("StatusLine", () => {
  it("renders the working face and elapsed seconds when busy", () => {
    const { lastFrame, unmount } = render(
      <StatusLine mood="working" busy elapsedMs={3200} phase="working…" />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain(FACES.working);
    expect(frame).toContain("3.2s");
    expect(frame).toContain("working…");
    unmount();
  });

  it("shows the idle face and a ready hint when not busy", () => {
    const { lastFrame, unmount } = render(
      <StatusLine mood="idle" busy={false} elapsedMs={0} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain(FACES.idle);
    expect(frame).toContain("ready");
    unmount();
  });
});
