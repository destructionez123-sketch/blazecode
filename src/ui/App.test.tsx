import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { App, shouldShowAsUser } from "./App.js";
import { Transcript } from "./components/Transcript.js";
import { EventBus } from "../core/events.js";

describe("App", () => {
  it("mounts and shows the status bar model", () => {
    const bus = new EventBus();
    const { lastFrame } = render(
      <App bus={bus} model="claude-opus-4-8" cwd="/proj" onSubmit={() => {}} />,
    );
    expect(lastFrame() ?? "").toContain("claude-opus-4-8");
  });

  it("renders user submissions and assistant text from the bus", () => {
    const bus = new EventBus();
    const { lastFrame, rerender } = render(
      <App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />,
    );
    bus.emit({ type: "text_delta", text: "hi from assistant" });
    bus.emit({ type: "turn_end", stopReason: "end" });
    rerender(<App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />);
    expect(lastFrame() ?? "").toContain("hi from assistant");
  });

  it("shows submitted plain text in the transcript", () => {
    const { lastFrame } = render(
      <Transcript items={[{ kind: "user", text: "hello world" }]} />,
    );
    expect(lastFrame() ?? "").toContain("hello world");
  });

  it("treats plain text as a user line and slash commands as not", () => {
    expect(shouldShowAsUser("hello world")).toBe(true);
    expect(shouldShowAsUser("/think")).toBe(false);
    expect(shouldShowAsUser("/model gpt-4")).toBe(false);
  });
});
