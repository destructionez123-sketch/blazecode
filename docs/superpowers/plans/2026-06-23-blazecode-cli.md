# BlazeCode CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, full-screen terminal AI coding agent CLI (`blaze`) that talks exclusively to BlazeAPI Premium models, with built-in tools, extended-thinking display, and MCP/Skills/Agents extensibility.

**Architecture:** A single TypeScript/Node package organized into focused modules. A UI-agnostic agent engine emits typed events over a bus; an Ink TUI subscribes. Provider adapters auto-select Anthropic vs OpenAI wire protocol by model id. Tools are registered with JSON-Schema definitions and dispatched through permission gates. MCP servers, skills, and agents extend the tool/context surface.

**Tech Stack:** TypeScript (ESM), Node ≥ 20, Ink (React for terminals), Zod (+ zod-to-json-schema), Vitest, tsup (esbuild) for builds, `@modelcontextprotocol/sdk` for MCP, `gray-matter` for frontmatter, `undici`/native `fetch` for HTTP.

## Global Constraints

- Node.js ≥ 20; package is ESM (`"type": "module"`).
- Target ONLY BlazeAPI Premium at base URL `https://api.blazeapi.org/paid/v1`. Never reference the free tier.
- Auth header: `Authorization: Bearer <key>`; key format starts with `blaze-`.
- Protocol auto-select: model ids matching `^claude-` use the Anthropic Messages API (`/messages`); all others use OpenAI Chat Completions (`/chat/completions`).
- Extended thinking is ON by default for `claude-*` models only.
- Binary name is `blaze`; package name `blazecode`.
- All file paths in tasks are relative to the repo root (`F:\blaze api cli`).
- Config dir: `%APPDATA%\blaze` (Windows) / `~/.config/blaze` (POSIX). Data dir: `~/.local/share/blaze` (POSIX) / `%APPDATA%\blaze` (Windows). Use the `env-paths` library to resolve.
- Use Vitest for all tests. Each task is TDD: failing test → run → implement → run → commit.
- Commit after every task with a conventional-commit message.

---

## Phase 0: Project Scaffolding

### Task 0: Initialize package, TypeScript, Vitest, tsup

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tsup.config.ts`
- Create: `src/index.ts`
- Test: `src/sanity.test.ts`

**Interfaces:**
- Produces: a buildable ESM package with `npm test` and `npm run build` working.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "blazecode",
  "version": "0.1.0",
  "description": "Terminal AI coding agent for BlazeAPI Premium models",
  "type": "module",
  "bin": { "blaze": "./dist/cli.js" },
  "files": ["dist"],
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "env-paths": "^3.0.0",
    "gray-matter": "^4.0.3",
    "ink": "^5.0.0",
    "react": "^18.3.1",
    "zod": "^3.23.0",
    "zod-to-json-schema": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": false,
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write `tsup.config.ts`**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts", index: "src/index.ts" },
  format: ["esm"],
  target: "node20",
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
```

- [ ] **Step 5: Write `src/index.ts`**

```ts
export const VERSION = "0.1.0";
```

- [ ] **Step 6: Write the sanity test `src/sanity.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { VERSION } from "./index.js";

describe("sanity", () => {
  it("exports a version", () => {
    expect(VERSION).toBe("0.1.0");
  });
});
```

- [ ] **Step 7: Install and run tests**

Run: `npm install && npm test`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold blazecode package with TS, Vitest, tsup"
```

---

## Phase 1: Config & Auth

### Task 1: Path resolution helper

**Files:**
- Create: `src/config/paths.ts`
- Test: `src/config/paths.test.ts`

**Interfaces:**
- Produces: `configDir(): string`, `dataDir(): string`, `authFilePath(): string`, `sessionsDir(): string`, `globalConfigPath(): string`.

- [ ] **Step 1: Write the failing test `src/config/paths.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { authFilePath, sessionsDir, globalConfigPath } from "./paths.js";

describe("paths", () => {
  it("auth file lives under config dir named auth.json", () => {
    expect(authFilePath().endsWith("auth.json")).toBe(true);
  });
  it("sessions dir ends with sessions", () => {
    expect(sessionsDir().endsWith("sessions")).toBe(true);
  });
  it("global config ends with blaze.json", () => {
    expect(globalConfigPath().endsWith("blaze.json")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/paths.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/config/paths.ts`**

```ts
import envPaths from "env-paths";
import { join } from "node:path";

const paths = envPaths("blaze", { suffix: "" });

export function configDir(): string {
  return paths.config;
}
export function dataDir(): string {
  return paths.data;
}
export function authFilePath(): string {
  return join(configDir(), "auth.json");
}
export function sessionsDir(): string {
  return join(dataDir(), "sessions");
}
export function globalConfigPath(): string {
  return join(configDir(), "blaze.json");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/paths.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add config/data path resolution"
```

### Task 2: Auth store (load/save/validate key)

**Files:**
- Create: `src/config/auth.ts`
- Test: `src/config/auth.test.ts`

**Interfaces:**
- Consumes: `authFilePath()` from `src/config/paths.ts`.
- Produces: `loadKey(): Promise<string | null>` (env `BLAZE_API_KEY` first, then file), `saveKey(key: string): Promise<void>`, `isValidKeyFormat(key: string): boolean`.

- [ ] **Step 1: Write the failing test `src/config/auth.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { isValidKeyFormat } from "./auth.js";

describe("auth key format", () => {
  it("accepts keys starting with blaze-", () => {
    expect(isValidKeyFormat("blaze-abc123")).toBe(true);
  });
  it("rejects empty or wrong-prefix keys", () => {
    expect(isValidKeyFormat("")).toBe(false);
    expect(isValidKeyFormat("sk-abc")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/auth.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/config/auth.ts`**

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { authFilePath } from "./paths.js";

export function isValidKeyFormat(key: string): boolean {
  return typeof key === "string" && key.startsWith("blaze-") && key.length > 6;
}

export async function loadKey(): Promise<string | null> {
  const env = process.env.BLAZE_API_KEY;
  if (env && isValidKeyFormat(env)) return env;
  try {
    const raw = await readFile(authFilePath(), "utf8");
    const data = JSON.parse(raw) as { key?: string };
    return data.key && isValidKeyFormat(data.key) ? data.key : null;
  } catch {
    return null;
  }
}

export async function saveKey(key: string): Promise<void> {
  const path = authFilePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify({ key }, null, 2), { mode: 0o600 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add auth key store with env override"
```

### Task 3: Config schema + resolution (env > project > global > defaults)

**Files:**
- Create: `src/config/schema.ts`
- Create: `src/config/load.ts`
- Test: `src/config/load.test.ts`

**Interfaces:**
- Consumes: `globalConfigPath()` from paths.
- Produces: `BlazeConfig` type; `DEFAULT_CONFIG: BlazeConfig`; `mergeConfig(...parts: Partial<BlazeConfig>[]): BlazeConfig`; `loadConfig(cwd: string): Promise<BlazeConfig>`.
- `BlazeConfig` shape:
  ```ts
  interface ThinkingConfig { enabled: boolean; budgetTokens: number }
  interface McpServerConfig {
    type: "stdio" | "http";
    command?: string; args?: string[]; env?: Record<string, string>;
    url?: string;
  }
  interface PermissionConfig { bash: "ask" | "allow"; write: "ask" | "allow"; edit: "ask" | "allow" }
  interface BlazeConfig {
    model: string;
    baseUrl: string;
    thinking: ThinkingConfig;
    permission: PermissionConfig;
    mcpServers: Record<string, McpServerConfig>;
    theme: string;
  }
  ```

- [ ] **Step 1: Write the failing test `src/config/load.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, mergeConfig } from "./load.js";

describe("config merge", () => {
  it("defaults have premium base url and a claude model", () => {
    expect(DEFAULT_CONFIG.baseUrl).toBe("https://api.blazeapi.org/paid/v1");
    expect(DEFAULT_CONFIG.model.startsWith("claude-")).toBe(true);
  });
  it("later parts override earlier ones", () => {
    const merged = mergeConfig(DEFAULT_CONFIG, { model: "deepseek-v3.2" });
    expect(merged.model).toBe("deepseek-v3.2");
    expect(merged.baseUrl).toBe(DEFAULT_CONFIG.baseUrl);
  });
  it("thinking on by default", () => {
    expect(DEFAULT_CONFIG.thinking.enabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/load.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/config/schema.ts`**

```ts
import { z } from "zod";

export const McpServerSchema = z.object({
  type: z.enum(["stdio", "http"]),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  url: z.string().optional(),
});

export const ConfigSchema = z.object({
  model: z.string(),
  baseUrl: z.string(),
  thinking: z.object({ enabled: z.boolean(), budgetTokens: z.number() }),
  permission: z.object({
    bash: z.enum(["ask", "allow"]),
    write: z.enum(["ask", "allow"]),
    edit: z.enum(["ask", "allow"]),
  }),
  mcpServers: z.record(McpServerSchema),
  theme: z.string(),
});

export type BlazeConfig = z.infer<typeof ConfigSchema>;
export type McpServerConfig = z.infer<typeof McpServerSchema>;
```

- [ ] **Step 4: Implement `src/config/load.ts`**

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigSchema, type BlazeConfig } from "./schema.js";
import { globalConfigPath } from "./paths.js";

export const DEFAULT_CONFIG: BlazeConfig = {
  model: "claude-opus-4-8",
  baseUrl: "https://api.blazeapi.org/paid/v1",
  thinking: { enabled: true, budgetTokens: 4000 },
  permission: { bash: "ask", write: "ask", edit: "ask" },
  mcpServers: {},
  theme: "blaze",
};

export function mergeConfig(...parts: Partial<BlazeConfig>[]): BlazeConfig {
  return parts.reduce<BlazeConfig>(
    (acc, part) => ({ ...acc, ...part }) as BlazeConfig,
    DEFAULT_CONFIG,
  );
}

async function readJsonIfExists(path: string): Promise<Partial<BlazeConfig>> {
  try {
    const raw = await readFile(path, "utf8");
    return ConfigSchema.partial().parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function loadConfig(cwd: string): Promise<BlazeConfig> {
  const global = await readJsonIfExists(globalConfigPath());
  const project = await readJsonIfExists(join(cwd, "blaze.json"));
  const envOverrides: Partial<BlazeConfig> = {};
  if (process.env.BLAZE_MODEL) envOverrides.model = process.env.BLAZE_MODEL;
  return mergeConfig(global, project, envOverrides);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/config/load.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add config schema and resolution order"
```

---

## Phase 2: Provider Layer

### Task 4: Shared provider types + normalized stream events

**Files:**
- Create: `src/core/provider/types.ts`
- Test: `src/core/provider/types.test.ts`

**Interfaces:**
- Produces the canonical types used everywhere downstream:
  ```ts
  interface ToolSchema { name: string; description: string; inputSchema: Record<string, unknown> }
  type Role = "user" | "assistant";
  interface ToolUse { id: string; name: string; input: Record<string, unknown> }
  interface ToolResult { toolUseId: string; content: string; isError?: boolean }
  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "thinking"; thinking: string }
    | { type: "tool_use"; tool: ToolUse }
    | { type: "tool_result"; result: ToolResult };
  interface Message { role: Role; content: ContentBlock[] }
  interface Usage { inputTokens: number; outputTokens: number }
  type StreamEvent =
    | { type: "text_delta"; text: string }
    | { type: "thinking_delta"; text: string }
    | { type: "tool_call"; tool: ToolUse }
    | { type: "usage"; usage: Usage }
    | { type: "done"; stopReason: string }
    | { type: "error"; message: string; status?: number };
  interface CompletionRequest {
    model: string;
    system?: string;
    messages: Message[];
    tools: ToolSchema[];
    thinking?: { enabled: boolean; budgetTokens: number };
    maxTokens: number;
  }
  interface Provider {
    name: "anthropic" | "openai";
    stream(req: CompletionRequest, key: string, baseUrl: string, signal: AbortSignal): AsyncIterable<StreamEvent>;
  }
  ```

- [ ] **Step 1: Write the failing test `src/core/provider/types.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import type { StreamEvent } from "./types.js";
import { isToolCall } from "./types.js";

describe("provider types", () => {
  it("isToolCall narrows tool_call events", () => {
    const ev: StreamEvent = { type: "tool_call", tool: { id: "1", name: "read", input: {} } };
    expect(isToolCall(ev)).toBe(true);
    expect(isToolCall({ type: "text_delta", text: "hi" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/provider/types.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/core/provider/types.ts`**

Define all the interfaces/types above as exported declarations, plus:

```ts
export function isToolCall(
  ev: StreamEvent,
): ev is Extract<StreamEvent, { type: "tool_call" }> {
  return ev.type === "tool_call";
}
```

(Write out every interface and the `StreamEvent` union exactly as listed in the Interfaces block. They are `export interface` / `export type` declarations.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/provider/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add normalized provider types and stream events"
```

### Task 5: SSE line parser

**Files:**
- Create: `src/core/provider/sse.ts`
- Test: `src/core/provider/sse.test.ts`

**Interfaces:**
- Produces: `async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncIterable<{ event?: string; data: string }>` — yields one entry per SSE event (blank-line delimited), carrying the `event:` name (if any) and concatenated `data:` payload. Skips `data: [DONE]` sentinels by yielding them as `{ data: "[DONE]" }`.

- [ ] **Step 1: Write the failing test `src/core/provider/sse.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseSSE } from "./sse.js";

function streamFrom(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe("parseSSE", () => {
  it("parses event + data pairs", async () => {
    const raw = "event: ping\ndata: {\"a\":1}\n\nevent: done\ndata: [DONE]\n\n";
    const out: Array<{ event?: string; data: string }> = [];
    for await (const e of parseSSE(streamFrom(raw))) out.push(e);
    expect(out[0]).toEqual({ event: "ping", data: '{"a":1}' });
    expect(out[1]).toEqual({ event: "done", data: "[DONE]" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/provider/sse.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/core/provider/sse.ts`**

```ts
export async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncIterable<{ event?: string; data: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event: string | undefined;
      const dataLines: string[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length > 0) yield { event, data: dataLines.join("\n") };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/provider/sse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add SSE stream parser"
```

### Task 6: Anthropic adapter (request build + event mapping)

**Files:**
- Create: `src/core/provider/anthropic.ts`
- Test: `src/core/provider/anthropic.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `sse.ts`.
- Produces: `buildAnthropicBody(req: CompletionRequest): Record<string, unknown>` and `mapAnthropicEvent(event: string | undefined, data: any): StreamEvent[]` (pure functions), plus `anthropicProvider: Provider`.
- Mapping rules: `content_block_start` with `tool_use` opens a tool accumulator keyed by index; `content_block_delta` `text_delta` → `{type:"text_delta"}`; `thinking_delta` → `{type:"thinking_delta"}`; `input_json_delta` accumulates tool input JSON; `content_block_stop` finalizes a tool_use → `{type:"tool_call"}`; `message_delta` carries usage + stop_reason; `message_stop` → `{type:"done"}`.

- [ ] **Step 1: Write the failing test `src/core/provider/anthropic.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildAnthropicBody } from "./anthropic.js";

describe("buildAnthropicBody", () => {
  it("includes thinking when enabled and maps tools to input_schema", () => {
    const body = buildAnthropicBody({
      model: "claude-opus-4-8",
      system: "be helpful",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [{ name: "read", description: "read a file", inputSchema: { type: "object" } }],
      thinking: { enabled: true, budgetTokens: 2000 },
      maxTokens: 1024,
    }) as any;
    expect(body.model).toBe("claude-opus-4-8");
    expect(body.system).toBe("be helpful");
    expect(body.stream).toBe(true);
    expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 2000 });
    expect(body.tools[0]).toEqual({
      name: "read",
      description: "read a file",
      input_schema: { type: "object" },
    });
  });

  it("omits thinking when disabled", () => {
    const body = buildAnthropicBody({
      model: "claude-opus-4-8",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [],
      thinking: { enabled: false, budgetTokens: 0 },
      maxTokens: 1024,
    }) as any;
    expect(body.thinking).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/provider/anthropic.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/core/provider/anthropic.ts`**

Implement `buildAnthropicBody` mapping our `Message`/`ContentBlock` to Anthropic content blocks (text, tool_use, tool_result), `tools` → `{name, description, input_schema}`, `thinking` → `{type:"enabled", budget_tokens}` only when enabled, `stream: true`, `max_tokens`. Implement `mapAnthropicEvent` per the rules in the Interfaces block. Implement `anthropicProvider.stream` to POST to `${baseUrl}/messages` with headers `{ "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }`, then iterate `parseSSE(res.body)`, `JSON.parse` each data line, and `yield*` `mapAnthropicEvent(...)`. On non-2xx, yield `{type:"error", message, status}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/provider/anthropic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Anthropic provider adapter"
```

### Task 7: OpenAI adapter (request build + event mapping)

**Files:**
- Create: `src/core/provider/openai.ts`
- Test: `src/core/provider/openai.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `sse.ts`.
- Produces: `buildOpenAIBody(req: CompletionRequest): Record<string, unknown>`, `openaiProvider: Provider`.
- Mapping: messages flatten to OpenAI `{role, content}` (+ `tool_calls` / `tool` role for results); tools → `{type:"function", function:{name, description, parameters}}`. Streamed deltas: `choices[0].delta.content` → text_delta; `choices[0].delta.tool_calls[].function.arguments` accumulate by index → tool_call on finish; `choices[0].finish_reason` → done; top-level `usage` → usage. No thinking for OpenAI models.

- [ ] **Step 1: Write the failing test `src/core/provider/openai.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildOpenAIBody } from "./openai.js";

describe("buildOpenAIBody", () => {
  it("maps tools to function format and sets stream", () => {
    const body = buildOpenAIBody({
      model: "deepseek-v3.2",
      messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      tools: [{ name: "grep", description: "search", inputSchema: { type: "object" } }],
      maxTokens: 512,
    }) as any;
    expect(body.model).toBe("deepseek-v3.2");
    expect(body.stream).toBe(true);
    expect(body.tools[0]).toEqual({
      type: "function",
      function: { name: "grep", description: "search", parameters: { type: "object" } },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/provider/openai.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/provider/openai.ts`**

Implement `buildOpenAIBody` (system message prepended from `req.system`, messages flattened, tools in function format, `stream:true`, `max_tokens`, `stream_options:{include_usage:true}`) and `openaiProvider.stream` POSTing to `${baseUrl}/chat/completions` with `Authorization: Bearer ${key}`, parsing SSE, skipping `[DONE]`, mapping deltas per the Interfaces rules.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/provider/openai.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add OpenAI provider adapter"
```

### Task 8: Provider selection by model id

**Files:**
- Create: `src/core/provider/select.ts`
- Test: `src/core/provider/select.test.ts`

**Interfaces:**
- Consumes: `anthropicProvider`, `openaiProvider`.
- Produces: `selectProvider(model: string): Provider`.

- [ ] **Step 1: Write the failing test `src/core/provider/select.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { selectProvider } from "./select.js";

describe("selectProvider", () => {
  it("uses anthropic for claude models", () => {
    expect(selectProvider("claude-opus-4-8").name).toBe("anthropic");
  });
  it("uses openai for everything else", () => {
    expect(selectProvider("deepseek-v3.2").name).toBe("openai");
    expect(selectProvider("glm-5.1").name).toBe("openai");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/provider/select.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/provider/select.ts`**

```ts
import type { Provider } from "./types.js";
import { anthropicProvider } from "./anthropic.js";
import { openaiProvider } from "./openai.js";

export function selectProvider(model: string): Provider {
  return /^claude-/.test(model) ? anthropicProvider : openaiProvider;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/provider/select.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add per-model provider selection"
```

---

## Phase 3: Permissions & Tools

### Task 9: Permission manager

**Files:**
- Create: `src/permissions/manager.ts`
- Test: `src/permissions/manager.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Decision = "allow_once" | "allow_always" | "deny";
  type Asker = (req: { tool: string; detail: string }) => Promise<Decision>;
  interface PermissionManager {
    check(tool: string, gate: "ask" | "allow", detail: string): Promise<boolean>;
  }
  function createPermissionManager(ask: Asker): PermissionManager;
  ```
- Behavior: if gate is `allow` → true. If `ask` and tool already in session allowlist → true. Otherwise call `ask`; `allow_always` adds to allowlist and returns true; `allow_once` returns true; `deny` returns false.

- [ ] **Step 1: Write the failing test `src/permissions/manager.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { createPermissionManager } from "./manager.js";

describe("permission manager", () => {
  it("auto-allows when gate is allow", async () => {
    const ask = vi.fn();
    const pm = createPermissionManager(ask as any);
    expect(await pm.check("bash", "allow", "ls")).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it("remembers allow_always for the session", async () => {
    const ask = vi.fn().mockResolvedValueOnce("allow_always");
    const pm = createPermissionManager(ask as any);
    expect(await pm.check("bash", "ask", "ls")).toBe(true);
    expect(await pm.check("bash", "ask", "pwd")).toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("denies when user denies", async () => {
    const ask = vi.fn().mockResolvedValue("deny");
    const pm = createPermissionManager(ask as any);
    expect(await pm.check("bash", "ask", "rm -rf /")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/permissions/manager.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/permissions/manager.ts`**

```ts
export type Decision = "allow_once" | "allow_always" | "deny";
export type Asker = (req: { tool: string; detail: string }) => Promise<Decision>;

export interface PermissionManager {
  check(tool: string, gate: "ask" | "allow", detail: string): Promise<boolean>;
}

export function createPermissionManager(ask: Asker): PermissionManager {
  const allowlist = new Set<string>();
  return {
    async check(tool, gate, detail) {
      if (gate === "allow") return true;
      if (allowlist.has(tool)) return true;
      const decision = await ask({ tool, detail });
      if (decision === "allow_always") {
        allowlist.add(tool);
        return true;
      }
      return decision === "allow_once";
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/permissions/manager.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add session permission manager"
```

### Task 10: Tool contract + registry

**Files:**
- Create: `src/tools/tool.ts`
- Create: `src/tools/registry.ts`
- Test: `src/tools/registry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface ToolContext { cwd: string }
  interface Tool<I = any> {
    name: string;
    description: string;
    schema: z.ZodType<I>;
    permission: "none" | "bash" | "write" | "edit";
    execute(input: I, ctx: ToolContext): Promise<string>;
  }
  function toolToSchema(tool: Tool): ToolSchema; // uses zod-to-json-schema
  class ToolRegistry {
    register(tool: Tool): void;
    get(name: string): Tool | undefined;
    list(): Tool[];
    schemas(): ToolSchema[];
  }
  ```

- [ ] **Step 1: Write the failing test `src/tools/registry.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ToolRegistry, toolToSchema } from "./registry.js";
import type { Tool } from "./tool.js";

const dummy: Tool = {
  name: "echo",
  description: "echoes input",
  schema: z.object({ text: z.string() }),
  permission: "none",
  async execute(input: { text: string }) {
    return input.text;
  },
};

describe("tool registry", () => {
  it("registers and lists tools", () => {
    const reg = new ToolRegistry();
    reg.register(dummy);
    expect(reg.get("echo")).toBe(dummy);
    expect(reg.list()).toHaveLength(1);
  });
  it("produces json schema with name and description", () => {
    const schema = toolToSchema(dummy);
    expect(schema.name).toBe("echo");
    expect(schema.description).toBe("echoes input");
    expect(schema.inputSchema).toMatchObject({ type: "object" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/tools/tool.ts`** (the interfaces above as exported declarations).

- [ ] **Step 4: Implement `src/tools/registry.ts`**

```ts
import { zodToJsonSchema } from "zod-to-json-schema";
import type { ToolSchema } from "../core/provider/types.js";
import type { Tool } from "./tool.js";

export function toolToSchema(tool: Tool): ToolSchema {
  const json = zodToJsonSchema(tool.schema, { target: "openApi3" }) as Record<string, unknown>;
  delete (json as any).$schema;
  return { name: tool.name, description: tool.description, inputSchema: json };
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  list(): Tool[] {
    return [...this.tools.values()];
  }
  schemas(): ToolSchema[] {
    return this.list().map(toolToSchema);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/tools/registry.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add tool contract and registry"
```

### Task 11: File-read tools — read, glob, grep

**Files:**
- Create: `src/tools/builtin/read.ts`
- Create: `src/tools/builtin/glob.ts`
- Create: `src/tools/builtin/grep.ts`
- Test: `src/tools/builtin/read.test.ts`

**Interfaces:**
- Consumes: `Tool` from `tool.ts`.
- Produces: `readTool`, `globTool`, `grepTool` (all `permission: "none"`). `read` returns file contents with line-number prefixes. `glob` uses `node:fs` recursive walk + `picomatch` (add dependency `picomatch` ^4) returning newline-joined relative paths. `grep` scans matching files for a regex, returns `path:line: text` lines.

- [ ] **Step 1: Add dependency**

Run: `npm install picomatch@^4 && npm install -D @types/picomatch`

- [ ] **Step 2: Write the failing test `src/tools/builtin/read.test.ts`**

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/tools/builtin/read.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `read.ts`**

```ts
import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import type { Tool } from "../tool.js";

const schema = z.object({ path: z.string() });

export const readTool: Tool<{ path: string }> = {
  name: "read",
  description: "Read a file. Returns contents prefixed with line numbers.",
  schema,
  permission: "none",
  async execute({ path }, ctx) {
    const full = isAbsolute(path) ? path : join(ctx.cwd, path);
    const text = await readFile(full, "utf8");
    return text
      .split("\n")
      .map((line, i) => `${i + 1}: ${line}`)
      .join("\n");
  },
};
```

- [ ] **Step 5: Implement `glob.ts`** — tool `glob` with input `{ pattern: string }`, walks `ctx.cwd` recursively (skip `node_modules`, `.git`), filters with `picomatch(pattern)`, returns newline-joined relative paths.

- [ ] **Step 6: Implement `grep.ts`** — tool `grep` with input `{ pattern: string; include?: string }`, walks files (optionally filtered by `picomatch(include)`), tests each line against `new RegExp(pattern)`, returns `relpath:lineno: linetext` joined by newlines (cap 200 matches).

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/tools/builtin/read.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add read/glob/grep tools"
```

### Task 12: File-write tools — write, edit

**Files:**
- Create: `src/tools/builtin/write.ts`
- Create: `src/tools/builtin/edit.ts`
- Test: `src/tools/builtin/edit.test.ts`

**Interfaces:**
- Produces: `writeTool` (`permission:"write"`, input `{ path, content }`, creates dirs, writes file, returns confirmation) and `editTool` (`permission:"edit"`, input `{ path, oldString, newString, replaceAll? }`, exact string replace; errors if `oldString` absent or matches >1 when not replaceAll).

- [ ] **Step 1: Write the failing test `src/tools/builtin/edit.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/builtin/edit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `edit.ts`**

```ts
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";
import type { Tool } from "../tool.js";

const schema = z.object({
  path: z.string(),
  oldString: z.string(),
  newString: z.string(),
  replaceAll: z.boolean().optional(),
});

export const editTool: Tool<z.infer<typeof schema>> = {
  name: "edit",
  description: "Replace an exact string in a file.",
  schema,
  permission: "edit",
  async execute({ path, oldString, newString, replaceAll }, ctx) {
    const full = isAbsolute(path) ? path : join(ctx.cwd, path);
    const text = await readFile(full, "utf8");
    const count = text.split(oldString).length - 1;
    if (count === 0) throw new Error("oldString not found in content");
    if (count > 1 && !replaceAll)
      throw new Error("Found multiple matches; provide more context or set replaceAll");
    const next = replaceAll ? text.split(oldString).join(newString) : text.replace(oldString, newString);
    await writeFile(full, next);
    return `Edited ${path}`;
  },
};
```

- [ ] **Step 4: Implement `write.ts`** — `writeTool` with `mkdir(dirname, {recursive:true})` then `writeFile`, returns `Wrote ${path}`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/tools/builtin/edit.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add write/edit tools"
```

### Task 13: bash, webfetch, todo tools

**Files:**
- Create: `src/tools/builtin/bash.ts`
- Create: `src/tools/builtin/webfetch.ts`
- Create: `src/tools/builtin/todo.ts`
- Test: `src/tools/builtin/bash.test.ts`

**Interfaces:**
- Produces: `bashTool` (`permission:"bash"`, input `{ command, timeout? }`, runs via `node:child_process` `exec` with 120s default timeout, returns combined stdout+stderr), `webfetchTool` (`permission:"none"`, input `{ url }`, `fetch` then strip tags to text), `createTodoTool(store: TodoStore)` returning a tool plus an in-memory `TodoStore` whose state the UI can read.

- [ ] **Step 1: Write the failing test `src/tools/builtin/bash.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { bashTool } from "./bash.js";

describe("bash tool", () => {
  it("runs a command and captures output", async () => {
    const out = await bashTool.execute({ command: "echo blazetest" }, { cwd: process.cwd() });
    expect(out).toContain("blazetest");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tools/builtin/bash.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `bash.ts`**

```ts
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import type { Tool } from "../tool.js";

const run = promisify(exec);
const schema = z.object({ command: z.string(), timeout: z.number().optional() });

export const bashTool: Tool<z.infer<typeof schema>> = {
  name: "bash",
  description: "Run a shell command and return its output.",
  schema,
  permission: "bash",
  async execute({ command, timeout }, ctx) {
    try {
      const { stdout, stderr } = await run(command, {
        cwd: ctx.cwd,
        timeout: timeout ?? 120_000,
        maxBuffer: 10 * 1024 * 1024,
      });
      return [stdout, stderr].filter(Boolean).join("\n") || "(no output)";
    } catch (err: any) {
      return `Command failed: ${err.message}\n${err.stdout ?? ""}${err.stderr ?? ""}`;
    }
  },
};
```

- [ ] **Step 4: Implement `webfetch.ts`** — `fetch(url)`, get text, strip `<script>/<style>` and tags via regex to plain text, truncate to ~50k chars.

- [ ] **Step 5: Implement `todo.ts`** — export `interface TodoItem { content: string; status: "pending"|"in_progress"|"completed" }`, class `TodoStore { items: TodoItem[]; set(items): void }`, and `createTodoTool(store)` with input `{ todos: TodoItem[] }` that calls `store.set` and returns a rendered list.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/tools/builtin/bash.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add bash/webfetch/todo tools"
```

---

## Phase 4: Engine & Session

### Task 14: Event bus

**Files:**
- Create: `src/core/events.ts`
- Test: `src/core/events.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type EngineEvent =
    | { type: "text_delta"; text: string }
    | { type: "thinking_delta"; text: string }
    | { type: "tool_start"; name: string; input: unknown; id: string }
    | { type: "tool_end"; id: string; output: string; isError: boolean }
    | { type: "usage"; inputTokens: number; outputTokens: number }
    | { type: "turn_end"; stopReason: string }
    | { type: "error"; message: string };
  class EventBus { on(fn: (e: EngineEvent) => void): () => void; emit(e: EngineEvent): void }
  ```

- [ ] **Step 1: Write the failing test `src/core/events.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { EventBus } from "./events.js";

describe("event bus", () => {
  it("emits to subscribers and unsubscribes", () => {
    const bus = new EventBus();
    const fn = vi.fn();
    const off = bus.on(fn);
    bus.emit({ type: "text_delta", text: "hi" });
    off();
    bus.emit({ type: "text_delta", text: "bye" });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/events.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/events.ts`** (the `EngineEvent` union as exported type, and `EventBus` storing a `Set<fn>`, `on` returns an unsubscribe closure, `emit` iterates).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/events.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add engine event bus"
```

### Task 15: Session (history + token accounting + persistence)

**Files:**
- Create: `src/core/session.ts`
- Test: `src/core/session.test.ts`

**Interfaces:**
- Consumes: `Message` from provider types, `sessionsDir()` from paths.
- Produces:
  ```ts
  class Session {
    id: string;
    messages: Message[];
    inputTokens: number;
    outputTokens: number;
    addUser(text: string): void;
    addAssistant(content: ContentBlock[]): void;
    addToolResults(results: ToolResult[]): void;
    addUsage(input: number, output: number): void;
    save(): Promise<void>;
    static load(id: string): Promise<Session>;
  }
  ```

- [ ] **Step 1: Write the failing test `src/core/session.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Session } from "./session.js";

describe("session", () => {
  it("accumulates messages and tokens", () => {
    const s = new Session("test");
    s.addUser("hello");
    s.addUsage(10, 5);
    s.addUsage(3, 2);
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].role).toBe("user");
    expect(s.inputTokens).toBe(13);
    expect(s.outputTokens).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/session.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/session.ts`** per the Interfaces block. `addUser` pushes `{role:"user", content:[{type:"text", text}]}`. `addToolResults` pushes a `user` message whose content is the `tool_result` blocks. `save()` writes `${sessionsDir()}/${id}.json` (mkdir recursive). `load` reads + rehydrates.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add session state and persistence"
```

### Task 16: Agent engine loop

**Files:**
- Create: `src/core/engine.ts`
- Test: `src/core/engine.test.ts`

**Interfaces:**
- Consumes: `Provider`, `Session`, `EventBus`, `ToolRegistry`, `PermissionManager`, `BlazeConfig`.
- Produces:
  ```ts
  interface EngineDeps {
    provider: Provider; session: Session; bus: EventBus;
    tools: ToolRegistry; permissions: PermissionManager; config: BlazeConfig;
    key: string; cwd: string; system: string;
  }
  function createEngine(deps: EngineDeps): { run(userText: string, signal: AbortSignal): Promise<void> };
  ```
- Loop: addUser → while true: build `CompletionRequest`, stream provider events → forward text/thinking/usage to bus, collect `tool_call`s; on `done`, append assistant message; if tool calls present, for each: emit `tool_start`, permission `check` (deny → tool_result error "User denied"), else `execute`, emit `tool_end`, collect `ToolResult`; addToolResults and continue loop. If no tool calls, emit `turn_end` and break. Provider `error` events → emit `error` and break.

- [ ] **Step 1: Write the failing test `src/core/engine.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createEngine } from "./engine.js";
import { Session } from "./session.js";
import { EventBus } from "./events.js";
import { ToolRegistry } from "../tools/registry.js";
import { createPermissionManager } from "../permissions/manager.js";
import type { Provider, StreamEvent } from "./provider/types.js";
import { DEFAULT_CONFIG } from "../config/load.js";

function fakeProvider(scripts: StreamEvent[][]): Provider {
  let turn = 0;
  return {
    name: "anthropic",
    async *stream() {
      const events = scripts[turn++] ?? [{ type: "done", stopReason: "end_turn" }];
      for (const e of events) yield e;
    },
  };
}

describe("engine", () => {
  it("executes a tool then finishes", async () => {
    const reg = new ToolRegistry();
    reg.register({
      name: "echo",
      description: "echo",
      schema: z.object({ text: z.string() }),
      permission: "none",
      execute: async (i: any) => `echoed:${i.text}`,
    });
    const provider = fakeProvider([
      [
        { type: "tool_call", tool: { id: "t1", name: "echo", input: { text: "hi" } } },
        { type: "done", stopReason: "tool_use" },
      ],
      [
        { type: "text_delta", text: "all done" },
        { type: "done", stopReason: "end_turn" },
      ],
    ]);
    const bus = new EventBus();
    const events: string[] = [];
    bus.on((e) => events.push(e.type));
    const engine = createEngine({
      provider,
      session: new Session("t"),
      bus,
      tools: reg,
      permissions: createPermissionManager(async () => "allow_once"),
      config: DEFAULT_CONFIG,
      key: "blaze-x",
      cwd: process.cwd(),
      system: "sys",
    });
    await engine.run("do it", new AbortController().signal);
    expect(events).toContain("tool_start");
    expect(events).toContain("tool_end");
    expect(events).toContain("turn_end");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/engine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/engine.ts`** per the loop description in the Interfaces block.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add agent engine loop"
```

---

## Phase 5: Extensibility (MCP, Skills, Agents)

### Task 17: MCP client + tool bridging

**Files:**
- Create: `src/mcp/client.ts`
- Test: `src/mcp/client.test.ts`

**Interfaces:**
- Consumes: `@modelcontextprotocol/sdk`, `McpServerConfig`, `ToolRegistry`, `Tool`.
- Produces: `mcpToolName(server: string, tool: string): string` → `mcp__${server}__${tool}`; `async function connectMcpServers(servers: Record<string, McpServerConfig>, registry: ToolRegistry): Promise<{ close(): Promise<void> }>` which for each server creates a `Client` with `StdioClientTransport` (type stdio) or `StreamableHTTPClientTransport` (type http), lists tools, and registers each as a `Tool` (permission `"bash"`) whose `execute` calls `client.callTool` and stringifies the result.

- [ ] **Step 1: Write the failing test `src/mcp/client.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { mcpToolName } from "./client.js";

describe("mcp tool naming", () => {
  it("namespaces server and tool", () => {
    expect(mcpToolName("github", "create_issue")).toBe("mcp__github__create_issue");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/mcp/client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/mcp/client.ts`** per Interfaces. For the tool's `schema`, wrap the MCP `inputSchema` with a permissive `z.object({}).passthrough()` and store the raw JSON schema on the tool via `toolToSchema` override — simplest: give the bridged tool a `schema` of `z.record(z.unknown())` and set its description from the MCP tool. Convert tool input directly (it's already an object).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/mcp/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add MCP client and tool bridging"
```

### Task 18: Skills discovery + matching

**Files:**
- Create: `src/skills/skills.ts`
- Test: `src/skills/skills.test.ts`

**Interfaces:**
- Consumes: `gray-matter`, `configDir()`.
- Produces: `interface Skill { name: string; description: string; body: string; path: string }`; `async function discoverSkills(cwd: string): Promise<Skill[]>` scanning `${cwd}/.blaze/skills/*/SKILL.md` and `${configDir()}/skills/*/SKILL.md`; `createSkillTool(skills: Skill[]): Tool` with input `{ name: string }` returning the matching skill's `body`.

- [ ] **Step 1: Write the failing test `src/skills/skills.test.ts`**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSkills } from "./skills.js";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/skills/skills.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/skills/skills.ts`** per Interfaces (use `glob`-style recursive read or `fs.readdir`; parse with `matter`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/skills/skills.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add skills discovery and skill tool"
```

### Task 19: Agents (persona loader + task tool)

**Files:**
- Create: `src/agents/agents.ts`
- Test: `src/agents/agents.test.ts`

**Interfaces:**
- Consumes: `gray-matter`, `configDir()`, `createEngine`, `Session`, `EventBus`, `selectProvider`, `ToolRegistry`.
- Produces: `interface Agent { name: string; model?: string; tools?: string[]; permission?: Partial<PermissionConfig>; prompt: string }`; `async function discoverAgents(cwd: string): Promise<Agent[]>` scanning `.blaze/agents/*.md` (project) + global; `createTaskTool(deps)` returning a `task` tool with input `{ subagent_type: string; description: string; prompt: string }` that spins up a sub-engine for the named agent (filtered tool registry per `agent.tools`, its own Session, a throwaway bus that auto-allows nothing destructive — gate via parent permissions) and returns the subagent's final assistant text.

- [ ] **Step 1: Write the failing test `src/agents/agents.test.ts`**

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverAgents } from "./agents.js";

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "blaze-agents-"));
  const aDir = join(dir, ".blaze", "agents");
  await mkdir(aDir, { recursive: true });
  await writeFile(
    join(aDir, "reviewer.md"),
    "---\nname: reviewer\nmodel: claude-opus-4-8\ntools: [read, grep]\n---\nYou review code.",
  );
});

describe("discoverAgents", () => {
  it("loads agent personas with frontmatter and prompt", async () => {
    const agents = await discoverAgents(dir);
    const r = agents.find((a) => a.name === "reviewer");
    expect(r?.model).toBe("claude-opus-4-8");
    expect(r?.tools).toEqual(["read", "grep"]);
    expect(r?.prompt).toContain("You review code");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/agents/agents.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/agents/agents.ts`** per Interfaces.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/agents/agents.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add agents persona loader and task tool"
```

---

## Phase 6: TUI (Ink, fire theme)

### Task 20: Theme + token formatting helpers

**Files:**
- Create: `src/ui/theme.ts`
- Test: `src/ui/theme.test.ts`

**Interfaces:**
- Produces: `theme` object with hex colors `{ flame: "#ff6b1a", ember: "#ff3d3d", coal: "#7a7a7a", text: "#eaeaea", dim: "#888" }`; `formatTokens(n: number): string` (e.g. `1234567 → "1.2M"`, `4200 → "4.2K"`).

- [ ] **Step 1: Write the failing test `src/ui/theme.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { formatTokens, theme } from "./theme.js";

describe("ui theme helpers", () => {
  it("formats tokens compactly", () => {
    expect(formatTokens(1_200_000)).toBe("1.2M");
    expect(formatTokens(4200)).toBe("4.2K");
    expect(formatTokens(42)).toBe("42");
  });
  it("has a flame color", () => {
    expect(theme.flame).toMatch(/^#/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/theme.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/ui/theme.ts`** per Interfaces.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add fire theme and token formatting"
```

### Task 21: Ink components (StatusBar, Transcript, ThinkingPanel, ToolCard, PermissionPrompt, Input, App)

**Files:**
- Create: `src/ui/components/StatusBar.tsx`
- Create: `src/ui/components/Transcript.tsx`
- Create: `src/ui/components/ThinkingPanel.tsx`
- Create: `src/ui/components/ToolCard.tsx`
- Create: `src/ui/components/PermissionPrompt.tsx`
- Create: `src/ui/components/Input.tsx`
- Create: `src/ui/App.tsx`
- Test: `src/ui/components/StatusBar.test.tsx`

**Interfaces:**
- Consumes: `ink`, `react`, `theme`, `formatTokens`, the `EventBus`, engine.
- Produces React components. `StatusBar` props `{ model: string; inputTokens: number; outputTokens: number; cwd: string; branch?: string }` rendering a single bottom-aligned line with flame-colored model + compact tokens. `App` wires the bus to local state (transcript items, thinking buffer, pending permission), renders all subcomponents, captures input, and on submit calls `engine.run`. Thinking panel collapsed by default with a hint; `ctrl+t` toggles.

- [ ] **Step 1: Add test deps**

Run: `npm install -D ink-testing-library`

- [ ] **Step 2: Write the failing test `src/ui/components/StatusBar.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { StatusBar } from "./StatusBar.js";

describe("StatusBar", () => {
  it("shows model and compact token totals", () => {
    const { lastFrame } = render(
      <StatusBar model="claude-opus-4-8" inputTokens={1_200_000} outputTokens={4200} cwd="/proj" />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("claude-opus-4-8");
    expect(frame).toContain("1.2M");
    expect(frame).toContain("4.2K");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/ui/components/StatusBar.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement all components.** Start with `StatusBar.tsx` (a `Box` + `Text` line using `theme` colors and `formatTokens`). Then implement `ThinkingPanel` (dim italic, collapsible), `ToolCard` (collapsible tool name + truncated output, red on error), `PermissionPrompt` (radio list Allow once / Allow always / Deny via `useInput`), `Transcript` (maps items to text/tool/thinking renders), `Input` (controlled text input via `ink`’s `useInput` or `ink-text-input` — add `ink-text-input` dep), and `App.tsx` to compose them and subscribe to the bus.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/ui/components/StatusBar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Ink TUI components and App"
```

---

## Phase 7: Wiring & CLI

### Task 22: System prompt builder

**Files:**
- Create: `src/core/prompt.ts`
- Test: `src/core/prompt.test.ts`

**Interfaces:**
- Produces: `buildSystemPrompt(opts: { cwd: string; skills: Skill[]; agents: Agent[] }): string` — includes cwd, available tool usage guidance, the list of skill names+descriptions, and agent names for the `task` tool.

- [ ] **Step 1: Write the failing test `src/core/prompt.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./prompt.js";

describe("buildSystemPrompt", () => {
  it("lists skills and cwd", () => {
    const p = buildSystemPrompt({
      cwd: "/proj",
      skills: [{ name: "demo", description: "d", body: "", path: "" }],
      agents: [],
    });
    expect(p).toContain("/proj");
    expect(p).toContain("demo");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/prompt.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/core/prompt.ts`** per Interfaces.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add system prompt builder"
```

### Task 23: CLI entry (`blaze`, `blaze auth login`, `blaze run`)

**Files:**
- Create: `src/cli.ts`
- Create: `src/commands/auth.ts`
- Create: `src/commands/run.ts`
- Create: `src/app/bootstrap.ts`
- Test: `src/commands/auth.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `bootstrap(cwd: string): Promise<{ config; key; tools; skills; agents; system; mcpClose }>` — loads config + key, builds a `ToolRegistry` with all builtins (todo store + task tool + skill tool), connects MCP servers, discovers skills/agents, builds system prompt.
  - `src/commands/auth.ts`: `loginCommand(): Promise<void>` — prompt for key (using a minimal readline), validate format, `saveKey`.
  - `src/commands/run.ts`: `runHeadless(prompt: string): Promise<void>` — bootstrap, run engine once, print final text (no TUI).
  - `src/cli.ts`: parse `process.argv`: `auth login` → loginCommand; `run <prompt>` → runHeadless; no args → render Ink `App`. If no key found and interactive, render the key-paste prompt first.

- [ ] **Step 1: Write the failing test `src/commands/auth.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli.js";

describe("cli arg parsing", () => {
  it("recognizes auth login", () => {
    expect(parseArgs(["auth", "login"])).toEqual({ command: "auth-login" });
  });
  it("recognizes run with prompt", () => {
    expect(parseArgs(["run", "fix the bug"])).toEqual({ command: "run", prompt: "fix the bug" });
  });
  it("defaults to tui", () => {
    expect(parseArgs([])).toEqual({ command: "tui" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/commands/auth.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `parseArgs` in `src/cli.ts`** (export it), plus the command dispatch and `bootstrap`/command modules per Interfaces. The Ink render uses `render(<App .../>)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/commands/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Build and smoke-test**

Run: `npm run build && node dist/cli.js run "say hello in one word"`
Expected: prints a one-word reply (requires a valid `BLAZE_API_KEY` in env). If no key, it should print a clear "run `blaze auth login`" message.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add CLI entry, auth login, and headless run"
```

### Task 24: Slash commands + final integration

**Files:**
- Modify: `src/ui/App.tsx`
- Create: `src/ui/slash.ts`
- Test: `src/ui/slash.test.ts`

**Interfaces:**
- Produces: `parseSlash(input: string): { cmd: string; arg?: string } | null` recognizing `/model`, `/think`, `/clear`, `/agents`, `/mcp`, `/resume`, `/help`. `App` intercepts slash inputs before sending to the engine and applies them (e.g. `/model X` updates config.model, `/think` toggles `config.thinking.enabled`).

- [ ] **Step 1: Write the failing test `src/ui/slash.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseSlash } from "./slash.js";

describe("parseSlash", () => {
  it("parses /model with arg", () => {
    expect(parseSlash("/model claude-opus-4-8")).toEqual({ cmd: "model", arg: "claude-opus-4-8" });
  });
  it("parses /think with no arg", () => {
    expect(parseSlash("/think")).toEqual({ cmd: "think" });
  });
  it("returns null for normal text", () => {
    expect(parseSlash("hello there")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/slash.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/ui/slash.ts`** and wire handling into `App.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/slash.test.ts`
Expected: PASS.

- [ ] **Step 5: Full test + typecheck + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add slash commands and finalize integration"
```

---

## Self-Review Notes

- **Spec coverage:** provider auto-select (T8), Anthropic+OpenAI (T6/T7), thinking (T6 build + T21 panel + T24 toggle), engine loop (T16), session/tokens (T15), tools incl. task (T11–13, T19), MCP stdio+http (T17), skills (T18), agents (T19), config+auth+first-run prompt (T1–3, T23), permissions (T9, T16), TUI fire theme (T20–21), errors (provider adapters emit `{type:"error",status}`, surfaced by engine + App), headless run (T23), distribution (T0 bin/tsup). All spec sections map to tasks.
- **Placeholders:** none — every code step includes real code or a precise, self-contained description of the remaining mechanical implementation.
- **Type consistency:** `StreamEvent`, `Message`, `ContentBlock`, `ToolResult`, `Provider`, `Tool`, `ToolSchema`, `BlazeConfig`, `EngineEvent` names are used consistently across tasks.

