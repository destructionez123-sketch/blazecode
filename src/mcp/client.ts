import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig } from "../config/schema.js";
import type { Tool } from "../tools/tool.js";
import type { ToolRegistry } from "../tools/registry.js";

/** Namespace an MCP tool name as `mcp__<server>__<tool>`. */
export function mcpToolName(server: string, tool: string): string {
  return `mcp__${server}__${tool}`;
}

/** Convert an MCP callTool result into a string for the agent. */
export function stringifyMcpResult(res: unknown): string {
  const r = res as { content?: Array<{ type?: string; text?: string }> };
  const content = r?.content;
  if (Array.isArray(content)) {
    const textParts = content
      .filter((c) => c?.type === "text" && typeof c.text === "string")
      .map((c) => c.text as string);
    if (textParts.length > 0) return textParts.join("\n");
    return JSON.stringify(content);
  }
  return JSON.stringify(res);
}

/** Default per-server connect/listTools timeout in milliseconds. */
export const MCP_CONNECT_TIMEOUT_MS = 10_000;

/**
 * Race a promise against a timeout. Resolves with the promise's value if it
 * settles within `ms`, otherwise rejects with a timeout error mentioning
 * `label`. The timer is cleared once the original promise settles so it never
 * keeps the event loop alive.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[mcp] ${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function connectMcpServers(
  servers: Record<string, McpServerConfig>,
  registry: ToolRegistry,
): Promise<{ close(): Promise<void> }> {
  const clients: Client[] = [];

  async function connectOne(name: string, cfg: McpServerConfig): Promise<void> {
    const client = new Client(
      { name: "blazecode", version: "0.1.0" },
      { capabilities: {} },
    );

    // Wrap connect + listTools in a timeout so an unresponsive stdio server
    // can't hang bootstrap (the SDK's initialize default is 60s).
    const tools = await withTimeout(
      (async () => {
        if (cfg.type === "stdio") {
          const transport = new StdioClientTransport({
            command: cfg.command!,
            args: cfg.args ?? [],
            env: cfg.env,
          });
          await client.connect(transport);
        } else {
          const transport = new StreamableHTTPClientTransport(
            new URL(cfg.url!),
          );
          await client.connect(transport);
        }
        const { tools } = await client.listTools();
        return tools;
      })(),
      MCP_CONNECT_TIMEOUT_MS,
      name,
    );

    clients.push(client);

    for (const tool of tools) {
      const bridged: Tool<Record<string, unknown>> = {
        name: mcpToolName(name, tool.name),
        description: tool.description ?? "",
        schema: z.record(z.unknown()),
        permission: "bash",
        execute: async (input, _ctx) => {
          const res = await client.callTool({
            name: tool.name,
            arguments: input as Record<string, unknown>,
          });
          return stringifyMcpResult(res);
        },
      };
      // The MCP tool's inputSchema is already a JSON Schema object; surface it
      // so the model sees the real parameters instead of a generic object.
      if (tool.inputSchema) {
        bridged.jsonSchema = tool.inputSchema as Record<string, unknown>;
      }
      registry.register(bridged);
    }
  }

  // Connect servers in parallel; one bad (or timed-out) server shouldn't kill
  // startup or block the others.
  const results = await Promise.allSettled(
    Object.entries(servers).map(([name, cfg]) => connectOne(name, cfg)),
  );
  for (const result of results) {
    if (result.status === "rejected") {
      const err = result.reason;
      console.error(
        `[mcp] failed to connect to server: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return {
    close: async () => {
      for (const client of clients) {
        try {
          await client.close();
        } catch {
          // ignore close errors
        }
      }
    },
  };
}
