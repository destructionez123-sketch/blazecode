export const KNOWN_SLASH_COMMANDS: string[] = [
  "model",
  "think",
  "clear",
  "agents",
  "mcp",
  "resume",
  "help",
];

/**
 * Parse a slash command from raw input.
 *
 * Returns `null` for any input that does not start with "/" (after trimming),
 * AND for any leading-slash input whose command word is not in
 * {@link KNOWN_SLASH_COMMANDS}. This means input like `/etc/hosts is weird`
 * is treated as a normal message (returned as `null`) rather than a no-op
 * slash command, so it reaches the engine and shows in the transcript.
 *
 * For a recognized leading-slash command, splits on the first space: the word
 * after the "/" is `cmd` (without the slash) and the remainder (trimmed) is
 * `arg`, or `undefined` when there is no argument.
 */
export function parseSlash(input: string): { cmd: string; arg?: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const body = trimmed.slice(1);
  const spaceIdx = body.indexOf(" ");
  if (spaceIdx === -1) {
    return KNOWN_SLASH_COMMANDS.includes(body) ? { cmd: body } : null;
  }

  const cmd = body.slice(0, spaceIdx);
  if (!KNOWN_SLASH_COMMANDS.includes(cmd)) return null;
  const arg = body.slice(spaceIdx + 1).trim();
  return arg ? { cmd, arg } : { cmd };
}
