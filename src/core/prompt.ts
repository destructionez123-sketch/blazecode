import type { Skill } from "../skills/skills.js";
import type { Agent } from "../agents/agents.js";

export interface BuildSystemPromptOptions {
  cwd: string;
  skills: Skill[];
  agents: Agent[];
}

export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const { cwd, skills, agents } = opts;

  const sections: string[] = [];

  sections.push(
    [
      "You are BlazeCode, an interactive CLI coding agent.",
      "You help users with software engineering tasks: reading and understanding code,",
      "implementing features, fixing bugs, and explaining how things work.",
    ].join("\n"),
  );

  sections.push(`Current working directory: ${cwd}`);

  sections.push(
    [
      "Tool usage guidance:",
      "- You can read, write, and edit files.",
      "- You can run bash commands.",
      "- You can search the codebase (grep/glob).",
      "- You can fetch URLs.",
      "- You can track your work with todos.",
      "Prefer the dedicated tools over shell equivalents, and keep changes focused.",
    ].join("\n"),
  );

  if (skills.length > 0) {
    const lines = skills.map((s) => `- ${s.name}: ${s.description}`);
    sections.push(
      [
        "Available skills:",
        ...lines,
        "When a skill is relevant to the task, invoke the `skill` tool with its name to load its instructions.",
      ].join("\n"),
    );
  }

  if (agents.length > 0) {
    const lines = agents.map((a) => `- ${a.name}`);
    sections.push(
      [
        "Available agents for the `task` tool:",
        ...lines,
        "Dispatch a subagent with the `task` tool, passing the agent name as `subagent_type`, for focused independent work.",
      ].join("\n"),
    );
  }

  return sections.join("\n\n");
}
