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

/**
 * Schema for reading user-supplied config files. Every field — including the
 * keys of nested objects like `thinking` and `permission` — is optional so a
 * file may specify only the keys it wants to override (e.g.
 * `{"thinking":{"enabled":false}}`). Defaults supply the rest at merge time.
 */
export const PartialConfigSchema = ConfigSchema.deepPartial();

export type PartialBlazeConfig = z.infer<typeof PartialConfigSchema>;
