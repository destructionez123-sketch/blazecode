import { Box, Text } from "ink";
import { theme } from "../theme.js";
import { ToolCard } from "./ToolCard.js";

export type TranscriptItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; name: string; input: unknown; output?: string; isError?: boolean }
  | { kind: "error"; message: string };

export interface TranscriptProps {
  items: TranscriptItem[];
}

export function Transcript({ items }: TranscriptProps) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        switch (item.kind) {
          case "user":
            return (
              <Text key={i} color={theme.text}>
                › {item.text}
              </Text>
            );
          case "assistant":
            return (
              <Text key={i} color={theme.text}>
                {item.text}
              </Text>
            );
          case "tool":
            return (
              <ToolCard
                key={i}
                name={item.name}
                input={item.input}
                output={item.output}
                isError={item.isError}
              />
            );
          case "error":
            return (
              <Text key={i} color={theme.ember}>
                ✖ {item.message}
              </Text>
            );
        }
      })}
    </Box>
  );
}
