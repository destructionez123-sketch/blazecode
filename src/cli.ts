import { loginCommand } from "./commands/auth.js";
import { runHeadless } from "./commands/run.js";
import { startTui } from "./app/tui.js";
import { VERSION } from "./index.js";

export type ParsedArgs =
  | { command: "auth-login" }
  | { command: "run"; prompt: string }
  | { command: "tui" }
  | { command: "version" }
  | { command: "help" }
  | { command: "unknown"; input: string };

export function parseArgs(argv: string[]): ParsedArgs {
  const first = argv[0];

  if (first === "--version" || first === "-v") {
    return { command: "version" };
  }
  if (first === "--help" || first === "-h") {
    return { command: "help" };
  }

  if (argv.length === 0) {
    return { command: "tui" };
  }

  if (first === "auth") {
    if (argv[1] === "login") {
      return { command: "auth-login" };
    }
    // `auth` without (or with an unknown) subcommand.
    return { command: "unknown", input: argv.join(" ") };
  }

  if (first === "run") {
    return { command: "run", prompt: argv.slice(1).join(" ") };
  }

  // Any other first arg is an unknown command.
  return { command: "unknown", input: first };
}

const HELP_TEXT = `blaze - Terminal AI coding agent for BlazeAPI Premium models

Usage:
  blaze                  Launch the interactive TUI
  blaze run <prompt>     Run a single headless prompt and print the result
  blaze auth login       Save your BlazeAPI Premium key
  blaze --version, -v    Print the version
  blaze --help, -h       Show this help

Config & auth:
  On first run you'll be prompted for a key (blaze-...), stored locally.
  You can also set BLAZE_API_KEY in the environment.`;

async function startTuiCommand(): Promise<void> {
  await startTui(process.cwd());
}

export async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "auth-login":
      await loginCommand();
      break;
    case "run":
      await runHeadless(args.prompt);
      break;
    case "tui":
      await startTuiCommand();
      break;
    case "version":
      console.log(VERSION);
      break;
    case "help":
      console.log(HELP_TEXT);
      break;
    case "unknown":
      console.error(`Unknown command: ${args.input}`);
      console.error("Run `blaze --help` to see available commands.");
      process.exitCode = 1;
      break;
  }
}

// Do not auto-run under Vitest so `parseArgs` can be imported by tests
// without spawning the CLI.
if (!process.env.VITEST) {
  void main();
}
