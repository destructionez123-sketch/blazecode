import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { editTool } from "./edit.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "blaze-edit-"));
  await writeFile(join(dir, "f.txt"), "hello world");
});

describe("edit tool", () => {
  it("replaces an exact unique string", async () => {
    await editTool.execute(
      { path: "f.txt", oldString: "world", newString: "blaze" },
      { cwd: dir },
    );
    expect(await readFile(join(dir, "f.txt"), "utf8")).toBe("hello blaze");
  });

  it("throws when oldString not found", async () => {
    await expect(
      editTool.execute({ path: "f.txt", oldString: "nope", newString: "x" }, { cwd: dir }),
    ).rejects.toThrow();
  });
});
