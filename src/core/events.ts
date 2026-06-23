export type EngineEvent =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; text: string }
  | { type: "tool_start"; name: string; input: unknown; id: string }
  | { type: "tool_end"; id: string; output: string; isError: boolean }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "turn_end"; stopReason: string }
  | { type: "error"; message: string; status?: number }
  | { type: "info"; message: string };

export type EngineEventListener = (e: EngineEvent) => void;

export class EventBus {
  private listeners = new Set<EngineEventListener>();

  on(fn: EngineEventListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  emit(e: EngineEvent): void {
    for (const fn of this.listeners) {
      fn(e);
    }
  }
}
