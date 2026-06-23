import { loginCommand } from "./commands/auth.js";
import { runHeadless } from "./commands/run.js";
import { startTui } from "./app/tui.js";

export type ParsedArgs =
  | { command: "auth-login" }
  | { command: "run"; prompt: string }
  | { command: "tui" };

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv[0] === "auth" && argv[1] === "login") {
    return { command: "auth-login" };
  }
  if (argv[0] === "run") {
    return { command: "run", prompt: argv.slice(1).join(" ") };
  }
  return { command: "tui" };
}

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
  }
}

// Do not auto-run under Vitest so `parseArgs` can be imported by tests
// without spawning the CLI.
if (!process.env.VITEST) {
  void main();
}
