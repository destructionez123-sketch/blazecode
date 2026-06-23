import { describe, it, expect } from "vitest";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { Session } from "./session.js";
import { sessionsDir } from "../config/paths.js";

describe("session", () => {
  it("accumulates messages and tokens", () => {
    const s = new Session("test");
    s.addUser("hello");
    s.addUsage(10, 5);
    s.addUsage(3, 2);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe("user");
    expect(s.inputTokens).toBe(13);
    expect(s.outputTokens).toBe(7);
  });

  it("addToolResults pushes a user message of tool_result blocks", () => {
    const s = new Session("tr");
    s.addToolResults([
      { toolUseId: "t1", content: "ok" },
      { toolUseId: "t2", content: "boom", isError: true },
    ]);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe("user");
    expect(s.messages[0].content).toEqual([
      { type: "tool_result", result: { toolUseId: "t1", content: "ok" } },
      {
        type: "tool_result",
        result: { toolUseId: "t2", content: "boom", isError: true },
      },
    ]);
  });

  it("save/load round-trips messages and tokens", async () => {
    const id = `__blaze_test_${process.pid}_${Date.now()}`;
    const path = join(sessionsDir(), `${id}.json`);
    try {
      const s = new Session(id);
      s.addUser("hi");
      s.addAssistant([{ type: "text", text: "hello back" }]);
      s.addUsage(11, 4);
      await s.save();

      const loaded = await Session.load(id);
      expect(loaded.id).toBe(id);
      expect(loaded.messages).toEqual(s.messages);
      expect(loaded.inputTokens).toBe(11);
      expect(loaded.outputTokens).toBe(4);
    } finally {
      await rm(path, { force: true });
    }
  });
});
