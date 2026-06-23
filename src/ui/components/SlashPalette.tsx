import { Box, Text } from "ink";
import { ui } from "../theme.js";

export interface PaletteItem {
  cmd: string;
  desc: string;
}

export interface SlashPaletteProps {
  items: PaletteItem[];
  query: string;
  selectedIndex: number;
}

/**
 * Filter palette items by `query` (case-insensitive). An empty query shows
 * everything; otherwise matches the command by prefix first, then substring.
 * Pure and unit-testable.
 */
export function filterPalette(items: PaletteItem[], query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (q === "") return items;
  return items.filter((item) => {
    const cmd = item.cmd.toLowerCase();
    return cmd.includes(q);
  });
}

export function SlashPalette({ items, query, selectedIndex }: SlashPaletteProps) {
  const filtered = filterPalette(items, query);
  if (filtered.length === 0) return null;

  const width = filtered.reduce((w, it) => Math.max(w, it.cmd.length), 0) + 2;

  return (
    <Box flexDirection="column" marginLeft={2}>
      {filtered.map((item, i) => {
        const selected = i === selectedIndex;
        return (
          <Text key={item.cmd}>
            {selected ? (
              <Text color={ui.flame} bold>
                {"❯ " + item.cmd.padEnd(width)}
              </Text>
            ) : (
              <Text color={ui.grey}>{"  " + item.cmd.padEnd(width)}</Text>
            )}
            <Text color={selected ? ui.grey : ui.faint}>{item.desc}</Text>
          </Text>
        );
      })}
    </Box>
  );
}
