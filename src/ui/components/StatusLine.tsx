import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { ui } from "../theme.js";
import { FACES, faceColor, type MascotMood } from "../mascot.js";

export interface StatusLineProps {
  mood: MascotMood;
  busy: boolean;
  elapsedMs: number;
  phase?: string;
}

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Live one-line status: Blaze's face, an animated braille spinner, the
 * current phase word, and elapsed seconds. The spinner animates via an
 * internal interval that is cleaned up on unmount and only runs while busy.
 */
export function StatusLine({ mood, busy, elapsedMs, phase }: StatusLineProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER.length);
    }, 80);
    return () => clearInterval(id);
  }, [busy]);

  const face = FACES[mood];

  if (!busy) {
    return (
      <Box marginTop={1}>
        <Text color={faceColor("idle")}>{FACES.idle}</Text>
        <Text color={ui.faint}>{"  ready"}</Text>
      </Box>
    );
  }

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <Box marginTop={1}>
      <Text color={faceColor(mood)}>{face}</Text>
      <Text color={ui.flame}>{" " + SPINNER[frame]}</Text>
      {phase ? <Text color={ui.flame}>{" " + phase}</Text> : null}
      <Text color={ui.faint}>{"  " + seconds + "s"}</Text>
    </Box>
  );
}
