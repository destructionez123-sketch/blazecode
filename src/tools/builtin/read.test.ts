import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTool } from "./read.js";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "blaze-read-"));
  await writeFile(join(dir, "a.txt"), "line one\nline two\n");
});

describe("read tool", () => {
  it("returns contents with line numbers", async () => {
    const out = await readTool.execute({ path: "a.txt" }, { cwd: dir });
    expect(out).toContain("1: line one");
    expect(out).toContain("2: line two");
  });
});
