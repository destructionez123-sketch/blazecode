import { ui } from "./theme.js";

/** Blaze's emotional states, driven by engine activity. */
export type MascotMood = "idle" | "thinking" | "working" | "done" | "error";

/** The mascot's name. */
export const MASCOT_NAME = "Blaze";

/** Ember accent reserved for high-energy / error states. */
const EMBER = "#ff3d3d";

/** Compact one-line faces for each mood, used as a gutter glyph + status. */
export const FACES: Record<MascotMood, string> = {
  idle: "(ᵔ◡ᵔ)",
  thinking: "(•ᴗ•)",
  working: "(>ᴗ<)",
  done: "(^◡^)",
  error: "(>﹏<)",
};

/**
 * Color for a mood's face: the flame accent for calm states, ember for the
 * high-energy "working" state and "error". Pure and unit-testable.
 */
export function faceColor(mood: MascotMood): string {
  return mood === "working" || mood === "error" ? EMBER : ui.flame;
}

/** Multi-line welcome art; the renderer colors each line in flame. */
export const WELCOME_FACE: string[] = ["  .", " ((o o))", "  \\‿/"];
