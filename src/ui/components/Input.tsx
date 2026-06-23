import { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { theme } from "../theme.js";

export interface InputProps {
  onSubmit: (value: string) => void;
  placeholder?: string;
}

export function Input({ onSubmit, placeholder }: InputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (v: string) => {
    onSubmit(v);
    setValue("");
  };

  return (
    <Box flexDirection="row">
      <Text color={theme.flame}>› </Text>
      <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} placeholder={placeholder} />
    </Box>
  );
}
