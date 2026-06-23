# BlazeCode CLI — Design

**Date:** 2026-06-23
**Status:** Approved (pending implementation plan)

## Summary

A terminal-based AI coding agent CLI (in the spirit of OpenCode / Claude Code) built
exclusively for **BlazeAPI Premium** models. It provides an agentic loop with built-in
tools, a polished full-screen Ink TUI with a fire/blaze theme, extended-thinking display,
and full extensibility via MCP, Skills, and custom Agents.

## Goals

- First-class agentic coding loop (read/write/edit/run/search) against BlazeAPI Premium.
- Very polished full-screen terminal UI (Ink, fire theme).
- Display of model extended thinking/reasoning.
- Deep extensibility: MCP (stdio + remote), Skills (markdown), custom Agents (personas).
- Interactive permission gates for destructive actions.

## Non-Goals

- Free tier (`free.blazeapi.org`) support — its API has no documented tool-calling, so it
  cannot power the agent loop. Premium only.
- Image/video generation tooling (the API supports it, but it is out of scope for v1).
- A separate backend, database, or Docker — fully self-contained CLI.

## Target API

- **Base URL:** `https://api.blazeapi.org/paid/v1` (direct endpoint, recommended for agents).
- **Anthropic Messages API:** `POST /messages` — used for `claude-*` models. Supports
  `tools`, `system`, streaming, and extended `thinking` blocks.
- **OpenAI Chat Completions:** `POST /chat/completions` — used for non-claude models
  (`deepseek-*`, `glm-*`, `gpt-*`), with OpenAI-style function calling.
- **Auth:** `Authorization: Bearer blaze-...` (also accepts `x-api-key` on Anthropic routes).
- **Billing:** token-based (input + output), 1:1, deducted from daily allowance.

## Prerequisites

- Node.js ≥ 20 (verified: v24.13.0), npm, Git.
- A truecolor-capable terminal (Windows Terminal / iTerm2 / etc.).
- A BlazeAPI **Premium** account + API key, on a paid plan with token allowance.
- Optional: runtimes required by configured MCP servers (e.g. `npx` for Node stdio servers).

## Architecture

Single npm package, internally organized into independent, focused modules. The **agent
engine is UI-agnostic**: it emits typed events; the Ink TUI subscribes. This keeps the loop
headlessly testable and each module focused.

```
blaze (bin)
  └─ cli entry → parse args, load config+auth, start TUI or headless run
       ├─ core/
       │    ├─ provider/        wire adapters: anthropic.ts, openai.ts, select.ts
       │    ├─ engine.ts        the agent loop (event-emitting, UI-agnostic)
       │    ├─ session.ts       message history, token accounting, persistence
       │    └─ events.ts        typed event bus
       ├─ tools/                built-in tools + registry
       ├─ mcp/                  MCP client: stdio + http/sse, tool bridging
       ├─ skills/               discovery, trigger-matching, injection
       ├─ agents/               persona loader, subagent runner
       ├─ config/               blaze.json + auth.json + .blaze/ resolution
       ├─ permissions/          approval gates + allowlist
       └─ ui/                   Ink components (transcript, input, statusbar, diffs)
```

### Data flow

CLI → engine builds request → provider adapter (chosen by model id) → stream events →
engine detects `tool_use` → permission gate → tool registry executes → result fed back as
`tool_result` → loop until model stops (`finish_reason: stop`). The UI only reads from the
event bus.

## Components

### Provider adapters (`core/provider/`)

- `select.ts` — model id → protocol. `claude-*` → Anthropic; else → OpenAI. Both target
  `https://api.blazeapi.org/paid/v1`.
- `anthropic.ts` — builds `/messages` requests (`tools`, `system`, `thinking`); parses SSE:
  `message_start`, `content_block_start/delta/stop` (text / `thinking` / `tool_use`),
  `message_delta` (usage), `message_stop`.
- `openai.ts` — builds `/chat/completions` (function-format `tools`); parses streamed
  `tool_calls` and content deltas; maps `reasoning` deltas to thinking where present.
- Both normalize to a common `StreamEvent` union:
  `text_delta | thinking_delta | tool_call | usage | done | error`.

### Engine (`core/engine.ts`)

The agent loop: send → stream → collect tool calls → permission gate → execute tools →
append `tool_result` → repeat until stop. Emits all activity to the typed event bus. No I/O
of its own beyond the provider call. Fully mockable for tests.

### Session (`core/session.ts`)

Message history; token accounting (running input+output total and remaining-allowance
display); persisted to `%APPDATA%\blaze\sessions\<id>.json` (Windows) /
`~/.local/share/blaze/sessions/<id>.json` (POSIX). Supports `--resume`.

### Tools (`tools/`)

Each tool: `{ name, description, schema (zod → JSON Schema), permission, execute }`. The
registry exposes schemas to the active provider and dispatches calls.

- `read`, `write`, `edit` (exact string replace), `glob`, `grep` — file ops.
- `bash` — shell exec with timeout + output capture (gated).
- `todo` — in-session task list rendered in the UI.
- `webfetch` — URL → markdown.
- `task` — dispatch a subagent (named persona) for a subtask.

`write` / `edit` / `bash` (and MCP/subagent shell) pass through permission gates; read-only
tools auto-approve.

### MCP (`mcp/`)

Config-driven via `mcpServers` in `blaze.json`. Transports: `stdio` (spawn subprocess,
JSON-RPC over stdio) and `http`/`sse` (remote). On startup: connect → `tools/list` →
namespace each tool as `mcp__<server>__<tool>` and register in the tool registry. Gated by
the same permission system.

### Skills (`skills/`)

Markdown files with frontmatter (`name`, `description`), discovered from `.blaze/skills/`
(project) and the global skills dir. A lightweight matcher exposes a `skill` tool; when a
skill applies, its content is injected into context.

### Agents (`agents/`)

Persona files (frontmatter: `name`, `model`, `prompt`, `tools` allowlist, `permission`
overrides) from `.blaze/agents/` + global. The `task` tool dispatches to a named agent that
runs its own engine loop with a fresh context and its own allowlist, returning a single
summary to the parent.

### Config & auth (`config/`)

- `blaze auth login` → stores key in `%APPDATA%\blaze\auth.json` /
  `~/.config/blaze/auth.json`. `BLAZE_API_KEY` env overrides.
- `blaze.json` (project, with global fallback): `model`, provider `options`, `mcpServers`,
  `agents`, `permission` defaults, `thinking` settings, `theme`.
- Resolution order: env > project > global > defaults.

### Permissions (`permissions/`)

Before `bash` / `write` / `edit` / MCP / subagent-shell actions: interactive TUI gate —
**Allow once / Allow always (session) / Deny**. Optional persisted allowlist patterns.
Read-only tools auto-approved.

### Thinking integration

- Provider layer parses Anthropic `thinking` / `thinking_delta` blocks (and OpenAI-style
  `reasoning` deltas) into normalized `thinking_delta` events.
- UI renders thinking in a dim/italic **collapsible** panel above the answer; toggle keybind
  and `/think` command.
- `blaze.json` exposes `thinking: { enabled, budgetTokens }`. **On by default** for
  `claude-*` models (thinking consumes tokens). Models without thinking support simply emit
  no thinking blocks.

### UI (`ui/`) — Ink, full-screen, fire theme

Alt-screen full-screen app: scrollable transcript, persistent input box, status bar
(model · tokens used/remaining · cwd · git branch), streaming spinner, collapsible dim
thinking panel, syntax-highlighted diffs for edits, collapsible tool-call cards. Slash
commands: `/model`, `/think`, `/clear`, `/agents`, `/mcp`, `/resume`. Fire/blaze palette
(orange→red truecolor accents).

## Error Handling

Map BlazeAPI status codes to friendly UX:

- `401` invalid key → prompt re-login.
- `403` plan/model not available → suggest upgrade or model switch.
- `429` daily-limit / RPM → show reset-at + exponential backoff.
- `502` / `503` upstream → auto-retry with exponential backoff.
- Tool errors are caught and returned to the model as `tool_result` errors so it can recover.

## Testing

Vitest (TS-native). Unit-test: provider SSE parsing (fixture streams), engine loop with a
mocked provider, each tool, config resolution, permission logic. The event-driven engine is
testable headlessly without Ink.

## Distribution

Single npm package, `bin: blaze`, runnable via `npx` or global install. Built with
`tsup`/esbuild to compile TypeScript.

## Open Questions

None at design time. Image/video tooling and Free-tier support are explicitly deferred.
