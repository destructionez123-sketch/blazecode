import type {
  CompletionRequest,
  Message,
  Provider,
  StreamEvent,
} from "./types.js";
import { parseSSE } from "./sse.js";

/** Flatten one of our Messages into zero+ OpenAI chat messages. */
function mapMessage(message: Message): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];

  // Collect text content into a single string.
  const text = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Assistant tool_use blocks become tool_calls.
  const toolUses = message.content.filter(
    (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use",
  );

  // tool_result blocks (present in user-role messages) become individual tool messages.
  const toolResults = message.content.filter(
    (b): b is Extract<typeof b, { type: "tool_result" }> =>
      b.type === "tool_result",
  );

  if (toolUses.length > 0) {
    out.push({
      role: "assistant",
      content: text,
      tool_calls: toolUses.map((b) => ({
        id: b.tool.id,
        type: "function",
        function: {
          name: b.tool.name,
          arguments: JSON.stringify(b.tool.input),
        },
      })),
    });
  } else if (toolResults.length === 0) {
    // Plain text user/assistant message.
    out.push({ role: message.role, content: text });
  }

  for (const b of toolResults) {
    out.push({
      role: "tool",
      tool_call_id: b.result.toolUseId,
      content: b.result.content,
    });
  }

  return out;
}

/** PURE: build the OpenAI /chat/completions request body. */
export function buildOpenAIBody(
  req: CompletionRequest,
): Record<string, unknown> {
  const messages: Record<string, unknown>[] = [];

  if (req.system !== undefined) {
    messages.push({ role: "system", content: req.system });
  }

  for (const m of req.messages) {
    messages.push(...mapMessage(m));
  }

  const body: Record<string, unknown> = {
    model: req.model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: req.maxTokens,
  };

  if (req.tools.length > 0) {
    body.tools = req.tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  return body;
}

interface ToolAccumulator {
  id: string;
  name: string;
  args: string;
}

export const openaiProvider: Provider = {
  name: "openai",
  async *stream(
    req: CompletionRequest,
    key: string,
    baseUrl: string,
    signal: AbortSignal,
  ): AsyncIterable<StreamEvent> {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(buildOpenAIBody(req)),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      yield {
        type: "error",
        message: `HTTP ${res.status}: ${text}`,
        status: res.status,
      };
      return;
    }

    if (!res.body) {
      yield { type: "error", message: "No response body", status: res.status };
      return;
    }

    // Tool calls accumulate by index across deltas.
    const tools = new Map<number, ToolAccumulator>();

    function flushTools(): StreamEvent[] {
      const events: StreamEvent[] = [];
      // Preserve index order.
      for (const idx of [...tools.keys()].sort((a, b) => a - b)) {
        const acc = tools.get(idx)!;
        let input: Record<string, unknown>;
        try {
          input = JSON.parse(acc.args || "{}");
        } catch {
          input = {};
        }
        events.push({
          type: "tool_call",
          tool: { id: acc.id, name: acc.name, input },
        });
      }
      tools.clear();
      return events;
    }

    for await (const { data } of parseSSE(res.body)) {
      if (data === "[DONE]") continue;

      let chunk: any;
      try {
        chunk = JSON.parse(data);
      } catch {
        continue;
      }

      const choice = chunk?.choices?.[0];
      const delta = choice?.delta;

      if (typeof delta?.content === "string" && delta.content.length > 0) {
        yield { type: "text_delta", text: delta.content };
      }

      if (Array.isArray(delta?.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const idx: number = tc.index ?? 0;
          let acc = tools.get(idx);
          if (!acc) {
            acc = { id: "", name: "", args: "" };
            tools.set(idx, acc);
          }
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (typeof tc.function?.arguments === "string") {
            acc.args += tc.function.arguments;
          }
        }
      }

      if (choice?.finish_reason) {
        // Flush accumulated tool calls before signalling done.
        yield* flushTools();
        yield { type: "done", stopReason: choice.finish_reason };
      }

      if (chunk?.usage) {
        yield {
          type: "usage",
          usage: {
            inputTokens: chunk.usage.prompt_tokens ?? 0,
            outputTokens: chunk.usage.completion_tokens ?? 0,
          },
        };
      }
    }
  },
};
