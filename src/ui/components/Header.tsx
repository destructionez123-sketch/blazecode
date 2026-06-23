import { Box, Text } from "ink";
import { ui, gradientChars, formatTokens } from "../theme.js";

export interface HeaderProps {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cwd: string;
  branch?: string;
}

/**
 * Thin top frame: a gradient `blaze` wordmark + tagline on the left, model
 * and token meta on the right, then a full-width faint hairline beneath. The
 * hairline-under approach keeps the corners pixel-tight without trying to
 * draw a continuous flexbox rule between the two runs.
 */
export function Header({
  model,
  inputTokens,
  outputTokens,
  branch,
}: HeaderProps) {
  const width = Math.min(process.stdout.columns || 80, 92);
  const wordmark = gradientChars("blaze");
  const totalTokens = formatTokens(inputTokens + outputTokens);

  return (
    <Box flexDirection="column">
      <Box justifyContent="space-between">
        <Text>
          <Text color={ui.faint}>{"╭─ "}</Text>
          {wordmark.map((g, i) => (
            <Text key={i} color={g.color} bold>
              {g.char}
            </Text>
          ))}
          <Text color={ui.faint}>{" ─ "}</Text>
          <Text color={ui.grey}>premium coding agent</Text>
        </Text>
        <Text>
          <Text color={ui.grey}>{model}</Text>
          <Text color={ui.faint}>{" · "}</Text>
          <Text color={ui.grey}>{totalTokens}</Text>
          {branch ? (
            <>
              <Text color={ui.faint}>{" · "}</Text>
              <Text color={ui.flame}>{branch}</Text>
            </>
          ) : null}
          <Text color={ui.faint}>{" ─╮"}</Text>
        </Text>
      </Box>
      <Text color={ui.faint}>{"─".repeat(width)}</Text>
    </Box>
  );
}
