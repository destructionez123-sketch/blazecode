import readline from "node:readline";
import { stdin as defaultInput, stdout as defaultOutput } from "node:process";
import type { Readable, Writable } from "node:stream";

/**
 * A minimal readline-like surface so the muting behaviour can be unit-tested
 * without touching the real TTY.
 */
export interface MutableReadline {
  question(query: string, callback: (answer: string) => void): void;
  close(): void;
  // node:readline writes echoed characters through this private method; we
  // override it to suppress echo of typed/pasted secrets.
  _writeToOutput?: (chunk: string) => void;
}

export interface PromptHiddenDeps {
  input?: Readable;
  output?: Writable;
  createInterface?: (input: Readable, output: Writable) => MutableReadline;
}

/**
 * Prompt for a line of input without echoing what the user types/pastes.
 *
 * The prompt text itself is written once, then readline's per-character echo
 * is suppressed by overriding `_writeToOutput`. A trailing newline is written
 * after the user presses enter so the cursor moves to the next line.
 */
export function promptHidden(
  query: string,
  deps: PromptHiddenDeps = {},
): Promise<string> {
  const input = deps.input ?? defaultInput;
  const output = deps.output ?? defaultOutput;
  const create =
    deps.createInterface ??
    ((i: Readable, o: Writable) =>
      readline.createInterface({ input: i, output: o }) as MutableReadline);

  return new Promise<string>((resolve) => {
    const rl = create(input, output);
    // Write the prompt once before muting so the user sees it.
    output.write(query);
    // Suppress echo of typed characters (including pasted secrets).
    rl._writeToOutput = () => {};
    rl.question("", (answer: string) => {
      output.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}
