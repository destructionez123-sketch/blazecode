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

  it("treats an unknown /foo as normal text (shown as user)", () => {
    expect(shouldShowAsUser("/foo bar")).toBe(true);
  });

  it("shows the slash palette when input starts with /", async () => {
    const bus = new EventBus();
    const { lastFrame, stdin } = render(
      <App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />,
    );
    // ink-testing-library swallows the first keystroke during focus init, so
    // send a harmless warmup byte before the real "/".
    stdin.write("\x08");
    await new Promise((r) => setTimeout(r, 30));
    stdin.write("/");
    await new Promise((r) => setTimeout(r, 80));
    const frame = lastFrame() ?? "";
    expect(frame).toContain("/model");
    expect(frame).toContain("/help");
  });

  it("does not leak pre-error partial text into the next turn", () => {
    const bus = new EventBus();
    const { lastFrame, rerender } = render(
      <App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />,
    );
    // Partial streamed text, then the turn errors out.
    bus.emit({ type: "text_delta", text: "PARTIAL-LEAK" });
    bus.emit({ type: "error", message: "boom" });
    rerender(<App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />);
    // New, clean turn.
    bus.emit({ type: "text_delta", text: "fresh answer" });
    bus.emit({ type: "turn_end", stopReason: "end" });
    rerender(<App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />);

    const frame = lastFrame() ?? "";
    expect(frame).toContain("fresh answer");
    expect(frame).not.toContain("PARTIAL-LEAKfresh answer");
  });

  it("shows the welcome screen when the transcript is empty and idle", () => {
    const bus = new EventBus();
    const { lastFrame } = render(
      <App bus={bus} model="m" cwd="/proj/blaze" onSubmit={() => {}} />,
    );
    expect(lastFrame() ?? "").toContain("Blaze");
    expect(lastFrame() ?? "").toContain("why is the build failing?");
  });

  it("shows a live status line while a turn is in progress", () => {
    const bus = new EventBus();
    const { lastFrame, rerender } = render(
      <App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />,
    );
    bus.emit({ type: "tool_start", name: "bash", input: { command: "npm test" }, id: "1" });
    rerender(<App bus={bus} model="m" cwd="/proj" onSubmit={() => {}} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("running bash…");
  });
});
