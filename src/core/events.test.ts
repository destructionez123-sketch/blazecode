import { describe, it, expect, vi } from "vitest";
import { EventBus } from "./events.js";

describe("event bus", () => {
  it("emits to subscribers and unsubscribes", () => {
    const bus = new EventBus();
    const fn = vi.fn();
    const off = bus.on(fn);
    bus.emit({ type: "text_delta", text: "hi" });
    off();
    bus.emit({ type: "text_delta", text: "bye" });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
