import { loadConfig } from "../config/load.js";
import { loadKey } from "../config/auth.js";
import type { BlazeConfig } from "../config/schema.js";
import { ToolRegistry } from "../tools/registry.js";
import { readTool } from "../tools/builtin/read.js";
import { globTool } from "../tools/builtin/glob.js";
import { grepTool } from "../tools/builtin/grep.js";
import { writeTool } from "../tools/builtin/write.js";
import { editTool } from "../tools/builtin/edit.js";
import { bashTool } from "../tools/builtin/bash.js";
import { webfetchTool } from "../tools/builtin/webfetch.js";
import { TodoStore, createTodoTool } from "../tools/builtin/todo.js";
import { connectMcpServers } from "../mcp/client.js";
import { discoverSkills, createSkillTool, type Skill } from "../skills/skills.js";
import { discoverAgents, createTaskTool, type Agent } from "../agents/agents.js";
import { buildSystemPrompt } from "../core/prompt.js";
import { createPermissionManager } from "../permissions/manager.js";

export interface BootstrapResult {
  config: BlazeConfig;
  key: string;
  tools: ToolRegistry;
  todoStore: TodoStore;
  skills: Skill[];
  agents: Agent[];
  system: string;
  mcpClose: () => Promise<void>;
}

export async function bootstrap(cwd: string): Promise<BootstrapResult> {
  const config = await loadConfig(cwd);

  const key = await loadKey();
  if (!key) {
    throw new Error(
      "No API key found. Run `blaze auth login` or set BLAZE_API_KEY.",
    );
  }

  const tools = new ToolRegistry();
  tools.register(readTool);
  tools.register(globTool);
  tools.register(grepTool);
  tools.register(writeTool);
  tools.register(editTool);
  tools.register(bashTool);
  tools.register(webfetchTool);

  const todoStore = new TodoStore();
  tools.register(createTodoTool(todoStore));

  const skills = await discoverSkills(cwd);
  tools.register(createSkillTool(skills));

  const agents = await discoverAgents(cwd);
  // Subagents in headless/bootstrap should not block on interactive prompts.
  // Use a deny-by-default asker; config gates of "allow" still pass through.
  const subagentPermissions = createPermissionManager(async () => "deny");
  tools.register(
    createTaskTool({
      agents,
      baseRegistry: tools,
      permissions: subagentPermissions,
      config,
      key,
      cwd,
    }),
  );

  const mcp = await connectMcpServers(config.mcpServers, tools);
  const mcpClose = mcp.close;

  const system = buildSystemPrompt({ cwd, skills, agents });

  return {
    config,
    key,
    tools,
    todoStore,
    skills,
    agents,
    system,
    mcpClose,
  };
}
