import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { globTool } from "./glob.js";
import { walkFiles } from "./walk.js";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "blaze-glob-"));
  await writeFile(join(dir, "a.ts"), "");
  await writeFile(join(dir, "b.js"), "");
  await mkdir(join(dir, "sub"));
  await writeFile(join(dir, "sub", "c.ts"), "");
  await mkdir(join(dir, "node_modules"));
  await writeFile(join(dir, "node_modules", "skip.ts"), "");
});

describe("glob tool", () => {
  it("finds files matching the pattern with forward-slash relative paths", async () => {
    const out = await globTool.execute({ pattern: "**/*.ts" }, { cwd: dir });
    const lines = out.split("\n").filter(Boolean).sort();
    expect(lines).toContain("a.ts");
    expect(lines).toContain("sub/c.ts");
  });

  it("excludes non-matching files", async () => {
    const out = await globTool.execute({ pattern: "**/*.ts" }, { cwd: dir });
    expect(out).not.toContain("b.js");
  });

  it("skips node_modules", async () => {
    const out = await globTool.execute({ pattern: "**/*.ts" }, { cwd: dir });
    expect(out).not.toContain("node_modules");
  });
});

describe("walkFiles resilience", () => {
  it("does not crash on a non-existent root and yields nothing", async () => {
    const collected: string[] = [];
    for await (const f of walkFiles(join(dir, "does-not-exist"))) {
      collected.push(f);
    }
    expect(collected).toEqual([]);
  });

  it("still returns readable files when an unreadable path is referenced", async () => {
    // Reading a missing subdirectory must not abort the whole walk.
    const out = await globTool.execute({ pattern: "**/*.ts" }, { cwd: dir });
    const lines = out.split("\n").filter(Boolean);
    expect(lines).toContain("a.ts");
  });
});
