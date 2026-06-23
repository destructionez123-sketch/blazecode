# BlazeCode

A terminal AI coding agent for [BlazeAPI Premium](https://blazeapi.org) models — in the
spirit of Claude Code and OpenCode, but built exclusively for BlazeAPI's catalog.

BlazeCode gives you an agentic coding loop in your terminal: it reads and edits files, runs
commands, searches your codebase, and streams the model's reasoning — with a polished
full-screen UI, permission gates, and deep extensibility via MCP, Skills, and custom Agents.

## Features

- **Agentic loop** — the model can read/write/edit files, run shell commands, search
  (glob/grep), fetch URLs, and track todos, iterating until the task is done.
- **BlazeAPI Premium only** — auto-selects the right wire protocol per model: the Anthropic
  Messages API for `claude-*` models and the OpenAI Chat Completions API for everything else,
  all against `https://api.blazeapi.org/paid/v1`.
- **Extended thinking** — streams and displays model reasoning in a collapsible panel
  (on by default for `claude-*` models).
- **Full-screen TUI** — built with Ink, a fire theme, a status bar (model · tokens · cwd),
  syntax-aware tool cards, and slash commands.
- **Permission gates** — bash, file writes, and edits prompt for approval
  (Allow once / Allow always / Deny); read-only tools run freely.
- **MCP** — connect Model Context Protocol servers (stdio and HTTP); their tools are exposed
  to the agent automatically.
- **Skills** — drop markdown capability files in `.blaze/skills/` and the agent can load them
  on demand.
- **Agents** — define named personas in `.blaze/agents/` with their own model and tool
  allowlist; the agent can dispatch them as subagents via the `task` tool.

## Requirements

- Node.js >= 20
- A [BlazeAPI Premium](https://blazeapi.org) account and API key (`blaze-...`). The Premium
  tier is required — it's the tier with tool-calling support that the agent loop needs.

## Install

```bash
npm install -g blazecode
```

Or run without installing:

```bash
npx blazecode
```

## Quick start

1. **Authenticate** (stores your key locally; you only do this once):

   ```bash
   blaze auth login
   ```

   Paste your BlazeAPI Premium key when prompted. Alternatively, set the `BLAZE_API_KEY`
   environment variable (it overrides the stored key — useful for CI).

2. **Start the interactive TUI** in your project directory:

   ```bash
   blaze
   ```

   Type a request, press Enter, and watch it work. On first run with no key found, it will
   prompt you to paste one.

3. **Or run headless** (one-shot, prints the result, no TUI):

   ```bash
   blaze run "explain what src/index.ts does"
   ```

## Commands

| Command            | Description                                        |
| ------------------ | -------------------------------------------------- |
| `blaze`            | Start the interactive full-screen TUI              |
| `blaze run <text>` | Run a single prompt headlessly and print the result|
| `blaze auth login` | Prompt for and securely store your API key         |
| `blaze --version`  | Print the version                                  |
| `blaze --help`     | Print usage                                        |

## Slash commands (in the TUI)

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `/model <id>`      | Switch the model for the next message|
| `/think`           | Toggle extended thinking             |
| `/clear`           | Clear the conversation               |
| `/help`            | Show available commands              |

`Ctrl+T` toggles the thinking panel. `Ctrl+C` exits.

## Configuration

BlazeCode reads configuration from, in order of precedence:

1. Environment variables (`BLAZE_API_KEY`, `BLAZE_MODEL`)
2. `blaze.json` in the current project directory
3. A global `blaze.json` in your config directory
4. Built-in defaults

### `blaze.json`

```json
{
  "model": "claude-opus-4-8",
  "thinking": { "enabled": true, "budgetTokens": 4000 },
  "permission": { "bash": "ask", "write": "ask", "edit": "ask" },
  "mcpServers": {
    "my-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "remote": {
      "type": "http",
      "url": "https://example.com/mcp"
    }
  },
  "theme": "blaze"
}
```

Partial configs are merged with the defaults, so you only need to specify what you want to
change.

### Skills

Create `.blaze/skills/<name>/SKILL.md` (project) or the same under your global config
directory. Each file uses frontmatter:

```markdown
---
name: my-skill
description: When to use this skill
---

Detailed instructions the agent loads on demand via the `skill` tool.
```

### Agents

Create `.blaze/agents/<name>.md`:

```markdown
---
name: reviewer
model: claude-opus-4-8
tools: [read, grep]
---

You are a meticulous code reviewer. ...
```

Dispatch one from the main agent via the `task` tool.

## Security notes

- Your API key is stored in your OS config directory and is never printed or logged. Key
  input is hidden as you type.
- Bash commands and file writes/edits require approval by default. MCP tools are gated too.
- The agent can read files and fetch URLs without prompting — review skills/agents you add
  from untrusted sources.

## Development

```bash
npm install
npm test          # run the test suite (Vitest)
npm run typecheck # tsc --noEmit
npm run build     # bundle to dist/ with tsup
```

## License

MIT — see [LICENSE](./LICENSE).
