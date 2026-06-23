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

/**
 * Build a compact one-line summary of a tool's output for the right gutter.
 * Pure and unit-testable.
 *   - error            -> "failed"
 *   - undefined output -> "" (still running)
 *   - bash             -> "exit ok · N lines"
 *   - read             -> "N lines"
 *   - single line      -> first ~30 chars of that line
 *   - otherwise        -> "N lines"
 */
export function summarizeOutput(
  name: string,
  output: string | undefined,
  isError: boolean,
): string {
  if (isError) return "failed";
  if (output === undefined) return "";
  const trimmed = output.replace(/\n+$/, "");
  const lines = trimmed === "" ? 0 : trimmed.split("\n").length;
  if (name === "bash") return `exit ok · ${lines} lines`;
  if (name === "read") return `${lines} lines`;
  if (lines <= 1) {
    const single = trimmed.trim();
    return single.length > 30 ? single.slice(0, 29) + "…" : single;
  }
  return `${lines} lines`;
}

export function ToolCard({ name, input, output, isError }: ToolCardProps) {
  const detail = toolDetail(input);
  const status = isError ? "✗" : output === undefined ? "•" : "✓";
  const statusColor = isError ? ui.flame : output === undefined ? ui.flame : ui.grey;
  const summary = summarizeOutput(name, output, isError ?? false);

  return (
    <Box justifyContent="space-between">
      <Text>
        <Text color={ui.faint}>{"  ↳ "}</Text>
        <Text color={ui.grey}>{name}</Text>
        {detail ? <Text color={ui.faint}>{"  " + detail}</Text> : null}
      </Text>
      <Text>
        {summary ? <Text color={ui.faint}>{summary + "  "}</Text> : null}
        <Text color={statusColor}>{status}</Text>
      </Text>
    </Box>
  );
}
