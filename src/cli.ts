import { loginCommand } from "./commands/auth.js";
import { runHeadless } from "./commands/run.js";
import { loadConfig } from "./config/load.js";

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

async function startTui(): Promise<void> {
  // Full interactive Ink App rendering is wired in Task 24.
  const config = await loadConfig(process.cwd());
  console.log("BlazeCode interactive mode");
  console.log(`Model: ${config.model}`);
  console.log("(interactive TUI wired in next step)");
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
      await startTui();
      break;
  }
}

// Do not auto-run under Vitest so `parseArgs` can be imported by tests
// without spawning the CLI.
if (!process.env.VITEST) {
  void main();
}
