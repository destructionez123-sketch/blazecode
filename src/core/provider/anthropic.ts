import type {
  CompletionRequest,
  ContentBlock,
  Message,
  Provider,
  StreamEvent,
} from "./types.js";
import { parseSSE } from "./sse.js";
import { fetchWithRetry } from "./retry.js";

/** Map one of our ContentBlocks to an Anthropic content block, or null to skip. */
function mapContentBlock(block: ContentBlock): Record<string, unknown> | null {
  switch (block.type) {
    case "text":
      return { type: "text", text: block.text };
    case "tool_use":
      return {
        type: "tool_use",
        id: block.tool.id,
        name: block.tool.name,
        input: block.tool.input,
      };
    case "tool_result":
      return {
        type: "tool_result",
        tool_use_id: block.result.toolUseId,
        content: block.result.content,
        is_error: block.result.isError ?? false,
      };
    case "thinking":
      // Assistant thinking blocks are not sent back in the outbound body.
      return null;
  }
}

function mapMessage(message: Message): Record<string, unknown> {
  const content = message.content
    .map(mapContentBlock)
    .filter((b): b is Record<string, unknown> => b !== null);
  return { role: message.role, content };
}

/** PURE: build the Anthropic /messages request body from a CompletionRequest. */
export function buildAnthropicBody(
  req: CompletionRequest,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: req.model,
    max_tokens: req.maxTokens,
    stream: true,
    messages: req.messages.map(mapMessage),
    tools: req.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    })),
  };

  if (req.system !== undefined) {
    body.system = req.system;
  }

  if (req.thinking?.enabled) {
    body.thinking = { type: "enabled", budget_tokens: req.thinking.budgetTokens };
  }

  return body;
}

/**
 * PURE: map one parsed Anthropic SSE event to zero+ normalized StreamEvents.
 * Stateless mappings only. Tool-use accumulation (which requires state across
 * events) is handled inside anthropicProvider.stream().
 */
export function mapAnthropicEvent(
  event: string | undefined,
  data: any,
): StreamEvent[] {
  switch (event) {
    case "message_start": {
      const usage = data?.message?.usage;
      return [
        {
          type: "usage",
          usage: {
            inputTokens: usage?.input_tokens ?? 0,
            outputTokens: usage?.output_tokens ?? 0,
          },
        },
      ];
    }
    case "content_block_delta": {
      const delta = data?.delta;
      if (delta?.type === "text_delta") {
        return [{ type: "text_delta", text: delta.text ?? "" }];
      }
      if (delta?.type === "thinking_delta") {
        return [{ type: "thinking_delta", text: delta.thinking ?? "" }];
      }
      return [];
    }
    case "message_delta": {
      if (data?.usage) {
        return [
          {
            type: "usage",
            usage: {
              inputTokens: data.usage.input_tokens ?? 0,
              outputTokens: data.usage.output_tokens ?? 0,
            },
          },
        ];
      }
      return [];
    }
    default:
      return [];
  }
}

interface ToolAccumulator {
  id: string;
  name: string;
  json: string;
}

export const anthropicProvider: Provider = {
  name: "anthropic",
  async *stream(
    req: CompletionRequest,
    key: string,
    baseUrl: string,
    signal: AbortSignal,
  ): AsyncIterable<StreamEvent> {
    const res = await fetchWithRetry(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(buildAnthropicBody(req)),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      yield { type: "error", message: `HTTP ${res.status}: ${text}`, status: res.status };
      return;
    }

    if (!res.body) {
      yield { type: "error", message: "No response body", status: res.status };
      return;
    }

    const tools = new Map<number, ToolAccumulator>();
    let stopReason: string | undefined;

    for await (const { event, data } of parseSSE(res.body)) {
      if (data === "[DONE]") continue;

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      // Track stop reason from message_delta.
      if (event === "message_delta" && parsed?.delta?.stop_reason) {
        stopReason = parsed.delta.stop_reason;
      }

      // Stateful tool_use accumulation.
      if (event === "content_block_start" && parsed?.content_block?.type === "tool_use") {
        tools.set(parsed.index, {
          id: parsed.content_block.id,
          name: parsed.content_block.name,
          json: "",
        });
        continue;
      }

      if (event === "content_block_delta" && parsed?.delta?.type === "input_json_delta") {
        const acc = tools.get(parsed.index);
        if (acc) acc.json += parsed.delta.partial_json ?? "";
        continue;
      }

      if (event === "content_block_stop") {
        const acc = tools.get(parsed.index);
        if (acc) {
          tools.delete(parsed.index);
          let input: Record<string, unknown>;
          try {
            input = JSON.parse(acc.json || "{}");
          } catch {
            input = {};
          }
          yield {
            type: "tool_call",
            tool: { id: acc.id, name: acc.name, input },
          };
        }
        continue;
      }

      if (event === "message_stop") {
        yield { type: "done", stopReason: stopReason ?? "end_turn" };
        continue;
      }

      yield* mapAnthropicEvent(event, parsed);
    }
  },
};
