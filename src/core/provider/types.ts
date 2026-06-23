export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type Role = "user" | "assistant";

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; tool: ToolUse }
  | { type: "tool_result"; result: ToolResult };

export interface Message {
  role: Role;
  content: ContentBlock[];
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; text: string }
  | { type: "tool_call"; tool: ToolUse }
  | { type: "usage"; usage: Usage }
  | { type: "done"; stopReason: string }
  | { type: "error"; message: string; status?: number };

export interface CompletionRequest {
  model: string;
  system?: string;
  messages: Message[];
  tools: ToolSchema[];
  thinking?: { enabled: boolean; budgetTokens: number };
  maxTokens: number;
}

export interface Provider {
  name: "anthropic" | "openai";
  stream(
    req: CompletionRequest,
    key: string,
    baseUrl: string,
    signal: AbortSignal,
  ): AsyncIterable<StreamEvent>;
}

export function isToolCall(
  ev: StreamEvent,
): ev is Extract<StreamEvent, { type: "tool_call" }> {
  return ev.type === "tool_call";
}
