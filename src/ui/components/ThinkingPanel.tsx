import { Box, Text } from "ink";
import { theme } from "../theme.js";

export interface ThinkingPanelProps {
  text: string;
  collapsed: boolean;
}

export function ThinkingPanel({ text, collapsed }: ThinkingPanelProps) {
  if (!text) return null;
  if (collapsed) {
    return (
      <Box>
        <Text color={theme.dim}>✦ thinking (ctrl+t to expand)</Text>
      </Box>
    );
  }
  return (
    <Box>
      <Text color={theme.dim} italic>
        {text}
      </Text>
    </Box>
  );
}
