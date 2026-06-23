import { basename } from "node:path";
import { Box, Text } from "ink";
import { theme, formatTokens } from "../theme.js";

export interface StatusBarProps {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cwd: string;
  branch?: string;
}

export function StatusBar({ model, inputTokens, outputTokens, cwd, branch }: StatusBarProps) {
  return (
    <Box flexDirection="row">
      <Text color={theme.flame}>{model}</Text>
      <Text color={theme.dim}>
        {" · "}
        {formatTokens(inputTokens)}↑ {formatTokens(outputTokens)}↓
      </Text>
      <Text color={theme.dim}>{" · " + basename(cwd)}</Text>
      {branch ? <Text color={theme.dim}>{" · " + branch}</Text> : null}
    </Box>
  );
}
