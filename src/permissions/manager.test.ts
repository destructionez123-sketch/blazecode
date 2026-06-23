import { describe, it, expect, vi } from "vitest";
import { createPermissionManager } from "./manager.js";

describe("permission manager", () => {
  it("auto-allows when gate is allow", async () => {
    const ask = vi.fn();
    const pm = createPermissionManager(ask as any);
    expect(await pm.check("bash", "allow", "ls")).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it("remembers allow_always for the session", async () => {
    const ask = vi.fn().mockResolvedValueOnce("allow_always");
    const pm = createPermissionManager(ask as any);
    expect(await pm.check("bash", "ask", "ls")).toBe(true);
    expect(await pm.check("bash", "ask", "pwd")).toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("denies when user denies", async () => {
    const ask = vi.fn().mockResolvedValue("deny");
    const pm = createPermissionManager(ask as any);
    expect(await pm.check("bash", "ask", "rm -rf /")).toBe(false);
  });
});
