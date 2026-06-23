export const theme = {
  flame: "#ff6b1a",
  ember: "#ff3d3d",
  coal: "#7a7a7a",
  text: "#eaeaea",
  dim: "#888",
} as const;

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}
