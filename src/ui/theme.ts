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

/**
 * Premium monochrome + single flame accent palette. Everything in the UI
 * draws from these four tokens; restraint reads as polish.
 */
export const ui = {
  flame: "#ff6b1a",
  white: "#f2f2f2",
  grey: "#9a9a9a",
  faint: "#4a4a4a",
} as const;

/** Fire gradient stops (orange -> red) used for the `blaze` wordmark. */
export const FIRE_GRADIENT = [
  "#ffb347",
  "#ff8c2b",
  "#ff6b1a",
  "#ff4d1a",
  "#ff3d3d",
];

/**
 * Map each character of `str` to a gradient stop spread evenly across the
 * string length. Pure and unit-testable; the first char always lands on the
 * first stop and the last char on the last stop.
 */
export function gradientChars(str: string): { char: string; color: string }[] {
  const chars = [...str];
  const last = FIRE_GRADIENT.length - 1;
  const span = Math.max(1, chars.length - 1);
  return chars.map((char, i) => {
    const idx = Math.min(last, Math.floor((i / span) * last));
    return { char, color: FIRE_GRADIENT[idx]! };
  });
}
