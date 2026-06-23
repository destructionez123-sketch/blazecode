import { describe, it, expect, beforeAll, vi } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSkills, createSkillTool, type Skill } from "./skills.js";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "blaze-skills-"));
  const skillDir = join(dir, ".blaze", "skills", "demo");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "SKILL.md"),
    "---\nname: demo\ndescription: a demo skill\n---\nDo the demo thing.",
  );
});

describe("discoverSkills", () => {
  it("finds project skills with frontmatter", async () => {
    const skills = await discoverSkills(dir);
    const demo = skills.find((s) => s.name === "demo");
    expect(demo?.description).toBe("a demo skill");
    expect(demo?.body).toContain("Do the demo thing");
  });

  it("skips a skill with malformed frontmatter and keeps the valid ones", async () => {
    const bad = await mkdtemp(join(tmpdir(), "blaze-skills-bad-"));
    const goodDir = join(bad, ".blaze", "skills", "good");
    const badDir = join(bad, ".blaze", "skills", "broken");
    await mkdir(goodDir, { recursive: true });
    await mkdir(badDir, { recursive: true });
    await writeFile(
      join(goodDir, "SKILL.md"),
      "---\nname: good\ndescription: fine\n---\nbody",
    );
    await writeFile(
      join(badDir, "SKILL.md"),
      "---\nname: [unclosed\n---\nbody",
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let skills: Skill[] = [];
    await expect(
      (async () => {
        skills = await discoverSkills(bad);
      })(),
    ).resolves.not.toThrow();
    expect(skills.find((s) => s.name === "good")).toBeTruthy();
    expect(skills.find((s) => s.name === "broken")).toBeFalsy();
    expect(spy.mock.calls.map((c) => String(c[0])).join("\n")).toContain(
      "[skills]",
    );
    spy.mockRestore();
  });
});

describe("createSkillTool", () => {
  const skills: Skill[] = [
    {
      name: "demo",
      description: "a demo skill",
      body: "Do the demo thing.",
      path: "/tmp/demo/SKILL.md",
    },
  ];

  it("returns the body for a known skill name", async () => {
    const tool = createSkillTool(skills);
    const result = await tool.execute({ name: "demo" }, { cwd: "/tmp" });
    expect(result).toBe("Do the demo thing.");
  });

  it("returns a not-found message for unknown names", async () => {
    const tool = createSkillTool(skills);
    const result = await tool.execute({ name: "missing" }, { cwd: "/tmp" });
    expect(result).toBe("Skill not found: missing");
  });
});
