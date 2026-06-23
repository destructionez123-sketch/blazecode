import { Box, Text } from "ink";
import { theme } from "../theme.js";

export interface ToolCardProps {
  name: string;
  input: unknown;
  output?: string;
  isError?: boolean;
  collapsed?: boolean;
}

function truncate(output: string): string {
  const byChars = output.length > 500 ? output.slice(0, 500) + "…" : output;
  const lines = byChars.split("\n");
  if (lines.length > 10) {
    return lines.slice(0, 10).join("\n") + "\n…";
  }
  return byChars;
}

export function ToolCard({ name, output, isError, collapsed }: ToolCardProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.coal} paddingX={1}>
      <Text color={isError ? theme.ember : theme.flame}>⚙ {name}</Text>
      {output && !collapsed ? <Text color={theme.dim}>{truncate(output)}</Text> : null}
    </Box>
  );
}
