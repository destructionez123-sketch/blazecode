import type { EventBus } from "./events.js";
import type { Session } from "./session.js";
import type {
  CompletionRequest,
  ContentBlock,
  Provider,
  ToolResult,
  ToolUse,
} from "./provider/types.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { PermissionManager } from "../permissions/manager.js";
import type { BlazeConfig } from "../config/schema.js";

const MAX_TOKENS = 8000;
const MAX_ITERATIONS = 50;

export interface EngineDeps {
  provider: Provider;
  session: Session;
  bus: EventBus;
  tools: ToolRegistry;
  permissions: PermissionManager;
  config: BlazeConfig;
  key: string;
  cwd: string;
  system: string;
}

export function createEngine(deps: EngineDeps): {
  run(userText: string, signal: AbortSignal): Promise<void>;
} {
  const {
    provider,
    session,
    bus,
    tools,
    permissions,
    config,
    key,
    cwd,
    system,
  } = deps;

  async function run(userText: string, signal: AbortSignal): Promise<void> {
    session.addUser(userText);

    let iterations = 0;
    while (true) {
      if (iterations >= MAX_ITERATIONS) {
        bus.emit({
          type: "error",
          message: `Reached maximum tool iterations (${MAX_ITERATIONS})`,
        });
        bus.emit({ type: "turn_end", stopReason: "max_iterations" });
        return;
      }
      iterations++;

      const req: CompletionRequest = {
        model: config.model,
        system,
        messages: session.messages,
        tools: tools.schemas(),
        thinking: config.thinking,
        maxTokens: MAX_TOKENS,
      };

      let text = "";
      const pendingToolUses: ToolUse[] = [];
      let stopReason = "end_turn";
      let errored = false;

      // Do NOT break on 'done': OpenAI emits 'usage' AFTER 'done', while
      // Anthropic emits it BEFORE. Consume the iterator to its natural end so
      // a trailing usage event is still captured. We just record stopReason
      // when 'done' arrives and keep iterating.
      for await (const ev of provider.stream(
        req,
        key,
        config.baseUrl,
        signal,
      )) {
        switch (ev.type) {
          case "text_delta":
            text += ev.text;
            bus.emit({ type: "text_delta", text: ev.text });
            break;
          case "thinking_delta":
            // Emit to bus only; thinking blocks are not persisted into session.
            bus.emit({ type: "thinking_delta", text: ev.text });
            break;
          case "tool_call":
            pendingToolUses.push(ev.tool);
            break;
          case "usage":
            session.addUsage(ev.usage.inputTokens, ev.usage.outputTokens);
            bus.emit({
              type: "usage",
              inputTokens: ev.usage.inputTokens,
              outputTokens: ev.usage.outputTokens,
            });
            break;
          case "done":
            stopReason = ev.stopReason || "end_turn";
            break;
          case "error":
            errored = true;
            bus.emit({ type: "error", message: ev.message, status: ev.status });
            break;
        }
      }

      // When the turn errored, do NOT commit any pending tool_use blocks:
      // an assistant message containing tool_use without a matching tool_result
      // makes the NEXT provider request malformed (both Anthropic and OpenAI
      // 400) and, since it's persisted, bricks the session. Commit only the
      // text block (if any) in that case.
      const content: ContentBlock[] = [
        ...(text ? [{ type: "text", text } as const] : []),
        ...(errored
          ? []
          : pendingToolUses.map(
              (tool) => ({ type: "tool_use", tool }) as const,
            )),
      ];
      // Never push an empty-content assistant message: Anthropic rejects empty
      // content arrays on the next request.
      if (content.length > 0) {
        session.addAssistant(content);
      }

      if (errored) {
        return;
      }

      if (pendingToolUses.length === 0) {
        bus.emit({ type: "turn_end", stopReason });
        return;
      }

      const results: ToolResult[] = [];
      for (const toolUse of pendingToolUses) {
        bus.emit({
          type: "tool_start",
          name: toolUse.name,
          input: toolUse.input,
          id: toolUse.id,
        });

        let resultContent: string;
        let isError: boolean;

        const tool = tools.get(toolUse.name);
        if (!tool) {
          resultContent = `Tool not found: ${toolUse.name}`;
          isError = true;
        } else {
          const gate =
            tool.permission === "none"
              ? "allow"
              : config.permission[tool.permission];
          const detail = JSON.stringify(toolUse.input).slice(0, 200);
          const allowed = await permissions.check(toolUse.name, gate, detail);
          if (!allowed) {
            resultContent = "User denied permission";
            isError = true;
          } else {
            const parsed = tool.schema.safeParse(toolUse.input);
            if (!parsed.success) {
              resultContent = `Invalid tool input: ${parsed.error.issues
                .map((i) => i.path.join(".") + ": " + i.message)
                .join("; ")}`;
              isError = true;
            } else {
              try {
                resultContent = await tool.execute(parsed.data, { cwd });
                isError = false;
              } catch (err) {
                resultContent = `Error: ${(err as Error).message}`;
                isError = true;
              }
            }
          }
        }

        bus.emit({
          type: "tool_end",
          id: toolUse.id,
          output: resultContent,
          isError,
        });
        results.push({
          toolUseId: toolUse.id,
          content: resultContent,
          isError,
        });
      }

      session.addToolResults(results);
      // continue loop
    }
  }

  return { run };
}
