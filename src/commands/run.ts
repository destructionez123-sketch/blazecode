import { bootstrap } from "../app/bootstrap.js";
import { Session } from "../core/session.js";
import { EventBus } from "../core/events.js";
import { selectProvider } from "../core/provider/select.js";
import { createPermissionManager } from "../permissions/manager.js";
import { createEngine } from "../core/engine.js";

export async function runHeadless(prompt: string): Promise<void> {
  const cwd = process.cwd();

  let b;
  try {
    b = await bootstrap(cwd);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  const session = new Session(`run-${Date.now()}`);
  const bus = new EventBus();
  const provider = selectProvider(b.config.model);
  // One-shot headless run: auto-allow gated tools once so the agent can act.
  const permissions = createPermissionManager(async () => "allow_once");

  bus.on((e) => {
    if (e.type === "text_delta") {
      process.stdout.write(e.text);
    } else if (e.type === "error") {
      console.error(e.message);
    }
  });

  const engine = createEngine({
    provider,
    session,
    bus,
    tools: b.tools,
    permissions,
    config: b.config,
    key: b.key,
    cwd,
    system: b.system,
  });

  await engine.run(prompt, new AbortController().signal);

  await b.mcpClose();
  process.stdout.write("\n");
}
