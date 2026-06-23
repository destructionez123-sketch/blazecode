import { createElement } from "react";
import { render } from "ink";
import { App, type AppPermissionRequest } from "../ui/App.js";
import { bootstrap, type BootstrapResult } from "./bootstrap.js";
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

  let b: BootstrapResult;
  try {
    b = await bootstrap(cwd);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  const session = new Session(`tui-${Date.now()}`);
  const bus = new EventBus();

  // Mutable runtime state that slash commands can change.
  let model = b.config.model;
  let thinkingEnabled = b.config.thinking.enabled;

  // Permission bridge: the asker stores a pending request in a closure
  // variable and triggers a rerender so the App shows the PermissionPrompt.
  // The user's decision resolves the promise and clears the pending request.
  let pending: AppPermissionRequest | undefined;

  // The render instance is created later; `rerenderApp` is a no-op until then.
  let rerenderTarget: ReturnType<typeof render> | undefined;
  function rerenderApp() {
    rerenderTarget?.rerender(buildApp());
  }

  const permissions = createPermissionManager(
    ({ tool, detail }) =>
      new Promise<Decision>((resolve) => {
        // Guard against the decision callback firing more than once (e.g. a
        // double-Enter race): resolve at most once and clear `pending`
        // atomically on the first call.
        let settled = false;
        pending = {
          tool,
          detail,
          onDecide: (decision) => {
            if (settled) return;
            settled = true;
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
  // Incremented on /clear so the App remounts with a fresh, empty transcript.
  let resetKey = 0;

  async function onSubmit(text: string): Promise<void> {
    // Empty/whitespace submissions are ignored entirely.
    if (text.trim() === "") return;

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
          // Remount the App to clear the visible transcript as well.
          resetKey += 1;
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
      key: resetKey,
      bus,
      model,
      cwd,
      onSubmit,
      permissionRequest: pending,
      thinkingCollapsed: true,
    });
  }

  try {
    const instance = render(buildApp());
    rerenderTarget = instance;
    await instance.waitUntilExit();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    await b.mcpClose();
  }
}
