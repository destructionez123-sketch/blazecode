import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeTool } from "./write.js";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "blaze-write-"));
});

describe("write tool", () => {
  it("writes a file and reads back its content", async () => {
    const result = await writeTool.execute(
      { path: "out.txt", content: "blaze content" },
      { cwd: dir },
    );
    expect(await readFile(join(dir, "out.txt"), "utf8")).toBe("blaze content");
    expect(result).toContain("out.txt");
  });

  it("creates nested directories as needed", async () => {
    await writeTool.execute(
      { path: join("nested", "deep", "file.txt"), content: "nested content" },
      { cwd: dir },
    );
    expect(await readFile(join(dir, "nested", "deep", "file.txt"), "utf8")).toBe(
      "nested content",
    );
  });
});
