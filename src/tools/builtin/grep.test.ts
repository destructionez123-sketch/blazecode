import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { grepTool } from "./grep.js";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "blaze-grep-"));
  await writeFile(join(dir, "a.ts"), "const foo = 1;\nconst bar = 2;\n");
  await mkdir(join(dir, "sub"));
  await writeFile(join(dir, "sub", "b.ts"), "function foo() {}\n");
  await writeFile(join(dir, "c.txt"), "foo in text\n");
});

describe("grep tool", () => {
  it("returns relpath:lineno: line for matches", async () => {
    const out = await grepTool.execute({ pattern: "foo" }, { cwd: dir });
    expect(out).toContain("a.ts:1: const foo = 1;");
    expect(out).toContain("sub/b.ts:1: function foo() {}");
  });

  it("does not report non-matching lines", async () => {
    const out = await grepTool.execute({ pattern: "foo" }, { cwd: dir });
    expect(out).not.toContain("const bar = 2;");
  });

  it("filters filenames with include", async () => {
    const out = await grepTool.execute(
      { pattern: "foo", include: "**/*.ts" },
      { cwd: dir },
    );
    expect(out).toContain("a.ts:1: const foo = 1;");
    expect(out).not.toContain("c.txt");
  });

  it("returns a friendly message for an invalid regex instead of throwing", async () => {
    const out = await grepTool.execute({ pattern: "(" }, { cwd: dir });
    expect(out).toBe("Invalid regex: (");
  });
});
