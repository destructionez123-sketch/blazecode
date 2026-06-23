import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG, mergeConfig, loadConfig } from "./load.js";

describe("config merge", () => {
  it("defaults have premium base url and a claude model", () => {
    expect(DEFAULT_CONFIG.baseUrl).toBe("https://api.blazeapi.org/paid/v1");
    expect(DEFAULT_CONFIG.model.startsWith("claude-")).toBe(true);
  });
  it("later parts override earlier ones", () => {
    const merged = mergeConfig(DEFAULT_CONFIG, { model: "deepseek-v3.2" });
    expect(merged.model).toBe("deepseek-v3.2");
    expect(merged.baseUrl).toBe(DEFAULT_CONFIG.baseUrl);
  });
  it("thinking on by default", () => {
    expect(DEFAULT_CONFIG.thinking.enabled).toBe(true);
  });
  it("deep-merges thinking, preserving sibling keys from earlier parts", () => {
    const merged = mergeConfig(DEFAULT_CONFIG, { thinking: { enabled: false } });
    expect(merged.thinking.enabled).toBe(false);
    expect(merged.thinking.budgetTokens).toBe(
      DEFAULT_CONFIG.thinking.budgetTokens,
    );
  });
  it("deep-merges permission, preserving sibling keys from earlier parts", () => {
    const merged = mergeConfig(DEFAULT_CONFIG, {
      permission: { bash: "allow" },
    });
    expect(merged.permission.bash).toBe("allow");
    expect(merged.permission.write).toBe(DEFAULT_CONFIG.permission.write);
    expect(merged.permission.edit).toBe(DEFAULT_CONFIG.permission.edit);
  });
  it("shallow-merges mcpServers by key", () => {
    const merged = mergeConfig(
      { mcpServers: { a: { type: "stdio", command: "a" } } },
      { mcpServers: { b: { type: "stdio", command: "b" } } },
    );
    expect(Object.keys(merged.mcpServers).sort()).toEqual(["a", "b"]);
  });
});

describe("loadConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a deep-partial project config and preserves defaults", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blaze-cfg-"));
    await writeFile(
      join(dir, "blaze.json"),
      JSON.stringify({ thinking: { enabled: false } }),
    );
    const cfg = await loadConfig(dir);
    expect(cfg.thinking.enabled).toBe(false);
    expect(cfg.thinking.budgetTokens).toBe(
      DEFAULT_CONFIG.thinking.budgetTokens,
    );
  });

  it("warns and ignores an invalid project config instead of silently dropping it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "blaze-cfg-"));
    await writeFile(
      join(dir, "blaze.json"),
      JSON.stringify({ thinking: { enabled: "yes please" } }),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cfg = await loadConfig(dir);
    // Falls back to defaults for the invalid file.
    expect(cfg.thinking.enabled).toBe(DEFAULT_CONFIG.thinking.enabled);
    expect(spy).toHaveBeenCalled();
    const msg = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(msg).toContain("[config]");
    expect(msg).toContain("blaze.json");
  });
});
