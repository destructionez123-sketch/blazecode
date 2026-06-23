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

  it("matches an LF oldString against a CRLF file and preserves CRLF", async () => {
    await writeFile(join(dir, "crlf.txt"), "alpha\r\nbeta\r\ngamma");
    await editTool.execute(
      { path: "crlf.txt", oldString: "alpha\nbeta", newString: "ALPHA\nBETA" },
      { cwd: dir },
    );
    const out = await readFile(join(dir, "crlf.txt"), "utf8");
    expect(out).toBe("ALPHA\r\nBETA\r\ngamma");
  });
});
