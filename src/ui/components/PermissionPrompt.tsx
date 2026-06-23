import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../theme.js";

export type PermissionDecision = "allow_once" | "allow_always" | "deny";

export interface PermissionPromptProps {
  tool: string;
  detail: string;
  onDecide: (d: PermissionDecision) => void;
}

const OPTIONS: { label: string; decision: PermissionDecision }[] = [
  { label: "Allow once", decision: "allow_once" },
  { label: "Allow always", decision: "allow_always" },
  { label: "Deny", decision: "deny" },
];

export function PermissionPrompt({ tool, detail, onDecide }: PermissionPromptProps) {
  const [selected, setSelected] = useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelected((s) => (s + OPTIONS.length - 1) % OPTIONS.length);
    } else if (key.downArrow) {
      setSelected((s) => (s + 1) % OPTIONS.length);
    } else if (key.return) {
      onDecide(OPTIONS[selected]!.decision);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.flame} paddingX={1}>
      <Text color={theme.flame}>Allow {tool}?</Text>
      <Text color={theme.dim}>{detail}</Text>
      {OPTIONS.map((opt, i) => (
        <Text key={opt.decision} color={i === selected ? theme.flame : theme.text}>
          {i === selected ? "› " : "  "}
          {opt.label}
        </Text>
      ))}
    </Box>
  );
}
