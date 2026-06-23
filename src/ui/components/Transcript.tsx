import { Box, Text } from "ink";
import { ui } from "../theme.js";
import { FACES } from "../mascot.js";
import { ToolCard } from "./ToolCard.js";

export type TranscriptItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; name: string; input: unknown; output?: string; isError?: boolean }
  | { kind: "error"; message: string }
  | { kind: "info"; text: string };

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
              <Box key={i} marginTop={1}>
                <Box flexShrink={0}>
                  <Text color={ui.flame}>{"▌ "}</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={ui.white}>{item.text}</Text>
                </Box>
              </Box>
            );
          case "assistant":
            return (
              <Box key={i} marginTop={1}>
                <Box flexShrink={0}>
                  <Text color={ui.flame}>{FACES.idle + " "}</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={ui.white}>{item.text}</Text>
                </Box>
              </Box>
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
              <Box key={i} marginTop={1}>
                <Box flexShrink={0}>
                  <Text color={ui.flame}>{"✗ "}</Text>
                </Box>
                <Box flexGrow={1}>
                  <Text color={ui.white}>{item.message}</Text>
                </Box>
              </Box>
            );
          case "info": {
            const lines = item.text.split("\n");
            return (
              <Box key={i} marginTop={1} flexDirection="column">
                {lines.map((line, j) => (
                  <Box key={j}>
                    <Box flexShrink={0}>
                      <Text color={ui.grey}>{j === 0 ? "› " : "  "}</Text>
                    </Box>
                    <Box flexGrow={1}>
                      <Text color={ui.grey}>{line}</Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            );
          }
        }
      })}
    </Box>
  );
}
