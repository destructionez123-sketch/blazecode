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
