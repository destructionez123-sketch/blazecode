import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { App } from "./App.js";
import { EventBus } from "../core/events.js";

// Repro for the "/skills inputs blank" bug: typing a slash command and pressing
// Enter must call onSubmit with the FULL command text (e.g. "/skills"), not "".
describe("App slash submit repro", () => {
  it("submits the full slash command text on Enter", async () => {
    const bus = new EventBus();
    const received: string[] = [];
    const { stdin } = render(
      <App
        bus={bus}
        model="m"
        cwd="/proj"
        onSubmit={(t) => received.push(t)}
      />,
    );
    // warmup byte (ink-testing focus init swallows first keystroke)
    stdin.write("\x08");
    await new Promise((r) => setTimeout(r, 30));
    stdin.write("/skills");
    await new Promise((r) => setTimeout(r, 60));
    stdin.write("\r"); // Enter
    await new Promise((r) => setTimeout(r, 60));
    expect(received).toEqual(["/skills"]);
  });

  it("renders info events (e.g. /skills output) in the transcript", async () => {
    const bus = new EventBus();
    const { lastFrame, rerender } = render(
      <App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />,
    );
    // Let the useEffect bus subscription attach before emitting.
    await new Promise((r) => setTimeout(r, 30));
    bus.emit({ type: "info", message: "skill-one — does a thing" });
    bus.emit({ type: "info", message: "skill-two — does another" });
    await new Promise((r) => setTimeout(r, 10));
    rerender(<App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("skill-one");
    expect(frame).toContain("skill-two");
  });
});
