import { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { ui } from "../theme.js";

export interface InputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
  /** When provided, the Input is controlled by the parent. */
  value?: string;
  onChange?: (value: string) => void;
}

export function Input({ onSubmit, placeholder, value, onChange }: InputProps) {
  // Uncontrolled fallback: keep internal state so existing callers (and the
  // clear-on-submit behavior) keep working when value/onChange are absent.
  const [internal, setInternal] = useState("");
  const controlled = value !== undefined && onChange !== undefined;
  const current = controlled ? value : internal;

  const handleChange = (v: string) => {
    if (controlled) onChange!(v);
    else setInternal(v);
  };

  const handleSubmit = (v: string) => {
    onSubmit(v);
    if (controlled) onChange!("");
    else setInternal("");
  };

  return (
    <Box borderStyle="round" borderColor={ui.flame} paddingX={1}>
      <Text color={ui.flame}>{"❯ "}</Text>
      <TextInput
        value={current}
        onChange={handleChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
      />
    </Box>
  );
}
