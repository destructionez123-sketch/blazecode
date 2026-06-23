import { Box, Text } from "ink";
import { ui } from "../theme.js";

export interface FooterProps {
  hints?: string[];
}

const DEFAULT_HINTS = [
  "/ commands",
  "⇥ accept",
  "^t thinking",
  "^c quit",
];

/** A faint single hint line beneath the input, joined by faint dots. */
export function Footer({ hints = DEFAULT_HINTS }: FooterProps) {
  return (
    <Box paddingX={1}>
      <Text color={ui.faint}>{hints.join(" · ")}</Text>
    </Box>
  );
}
