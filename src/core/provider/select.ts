import type { Provider } from "./types.js";
import { anthropicProvider } from "./anthropic.js";
import { openaiProvider } from "./openai.js";

export function selectProvider(model: string): Provider {
  return /^claude-/.test(model) ? anthropicProvider : openaiProvider;
}
