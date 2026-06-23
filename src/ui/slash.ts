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
 * Returns `null` for any input that does not start with "/" (after trimming).
 * For leading-slash input, splits on the first space: the word after the "/"
 * is `cmd` (without the slash) and the remainder (trimmed) is `arg`, or
 * `undefined` when there is no argument.
 *
 * Unknown leading-slash commands are still returned (with their `cmd`/`arg`)
 * so the caller can report them as unknown.
 */
export function parseSlash(input: string): { cmd: string; arg?: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const body = trimmed.slice(1);
  const spaceIdx = body.indexOf(" ");
  if (spaceIdx === -1) {
    return { cmd: body };
  }

  const cmd = body.slice(0, spaceIdx);
  const arg = body.slice(spaceIdx + 1).trim();
  return arg ? { cmd, arg } : { cmd };
}
