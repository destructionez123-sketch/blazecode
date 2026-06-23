import { Box, Text } from "ink";
import { ui } from "../theme.js";

export interface ToolCardProps {
  name: string;
  input: unknown;
  output?: string;
  isError?: boolean;
  collapsed?: boolean;
}

/**
 * Derive a compact, single-line detail string from a tool's input. Picks the
 * most relevant field (path/command/pattern/url) and truncates it so the
 * one-line card stays tight. Pure and unit-testable.
 */
export function toolDetail(input: unknown): string {
  if (input === null || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;
  const candidate =
    obj.path ?? obj.command ?? obj.pattern ?? obj.url ?? obj.file_path ?? "";
  const str = typeof candidate === "string" ? candidate : String(candidate);
  if (!str) return "";
  return str.length > 50 ? str.slice(0, 49) + "…" : str;
}

export function ToolCard({ name, input, output, isError }: ToolCardProps) {
  const detail = toolDetail(input);
  const status = isError ? "✗" : output === undefined ? "•" : "✓";
  const statusColor = isError ? ui.flame : output === undefined ? ui.flame : ui.grey;

  return (
    <Box justifyContent="space-between">
      <Text>
        <Text color={ui.faint}>{"  ↳ "}</Text>
        <Text color={ui.grey}>{name}</Text>
        {detail ? <Text color={ui.faint}>{"  " + detail}</Text> : null}
      </Text>
      <Text color={statusColor}>{status}</Text>
    </Box>
  );
}
