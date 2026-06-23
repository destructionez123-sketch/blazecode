import { describe, it, expect, beforeAll } from "vitest";
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
