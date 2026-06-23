import { createElement } from "react";
import { render } from "ink";
import { App, type AppPermissionRequest } from "../ui/App.js";
import { bootstrap } from "./bootstrap.js";
import { Session } from "../core/session.js";
import { EventBus } from "../core/events.js";
import { selectProvider } from "../core/provider/select.js";
import {
  createPermissionManager,
  type Decision,
} from "../permissions/manager.js";
import { createEngine } from "../core/engine.js";
import { isValidKeyFormat, loadKey, saveKey } from "../config/auth.js";
import { parseSlash } from "../ui/slash.js";
import { promptHidden } from "../util/prompt.js";

/**
 * Prompt the user for an API key on first run, validate, and persist it.
 * Returns true if a valid key is now available, false otherwise.
 */
async function promptForKey(): Promise<boolean> {
  const answer = await promptHidden(
    "Paste your BlazeAPI Premium key (blaze-...): ",
  );
  const key = answer.trim();
  if (!isValidKeyFormat(key)) {
    console.error("Invalid key format. Keys must start with 'blaze-'.");
    process.exitCode = 1;
    return false;
  }
  await saveKey(key);
  return true;
}

export async function startTui(cwd: string): Promise<void> {
  // First-run key prompt: ensure a key exists before bootstrap.
  const existingKey = await loadKey();
  if (!existingKey) {
    const ok = await promptForKey();
    if (!ok) return;
  }

  const b = await bootstrap(cwd);

  const session = new Session(`tui-${Date.now()}`);
  const bus = new EventBus();

  // Mutable runtime state that slash commands can change.
  let model = b.config.model;
  let thinkingEnabled = b.config.thinking.enabled;

  // Permission bridge: the asker stores a pending request in a closure
  // variable and triggers a rerender so the App shows the PermissionPrompt.
  // The user's decision resolves the promise and clears the pending request.
  let pending: AppPermissionRequest | undefined;

  const permissions = createPermissionManager(
    ({ tool, detail }) =>
      new Promise<Decision>((resolve) => {
        pending = {
          tool,
          detail,
          onDecide: (decision) => {
            pending = undefined;
            rerenderApp();
            resolve(decision);
          },
        };
        rerenderApp();
      }),
  );

  // Build a fresh engine each submit so /model and /think take effect on the
  // next message (provider depends on the selected model).
  function makeEngine() {
    const provider = selectProvider(model);
    return createEngine({
      provider,
      session,
      bus,
      tools: b.tools,
      permissions,
      config: {
        ...b.config,
        model,
        thinking: { ...b.config.thinking, enabled: thinkingEnabled },
      },
      key: b.key,
      cwd,
      system: b.system,
    });
  }

  let busy = false;

  async function onSubmit(text: string): Promise<void> {
    const slash = parseSlash(text);
    if (slash) {
      switch (slash.cmd) {
        case "model":
          if (slash.arg) model = slash.arg;
          break;
        case "think":
          thinkingEnabled = !thinkingEnabled;
          break;
        case "clear":
          session.messages = [];
          break;
        // agents / mcp / resume / help: best-effort no-ops for now.
        case "agents":
        case "mcp":
        case "resume":
        case "help":
        default:
          break;
      }
      rerenderApp();
      return;
    }

    if (busy) return;
    busy = true;
    try {
      const engine = makeEngine();
      await engine.run(text, new AbortController().signal);
    } catch (err) {
      bus.emit({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      busy = false;
    }
  }

  function buildApp() {
    return createElement(App, {
      bus,
      model,
      cwd,
      onSubmit,
      permissionRequest: pending,
      thinkingCollapsed: true,
    });
  }

  const instance = render(buildApp());

  function rerenderApp() {
    instance.rerender(buildApp());
  }

  try {
    await instance.waitUntilExit();
  } finally {
    await b.mcpClose();
  }
}
