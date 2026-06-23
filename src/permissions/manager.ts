export type Decision = "allow_once" | "allow_always" | "deny";
export type Asker = (req: { tool: string; detail: string }) => Promise<Decision>;

export interface PermissionManager {
  check(tool: string, gate: "ask" | "allow", detail: string): Promise<boolean>;
}

export function createPermissionManager(ask: Asker): PermissionManager {
  const allowlist = new Set<string>();
  return {
    async check(tool, gate, detail) {
      if (gate === "allow") return true;
      if (allowlist.has(tool)) return true;
      const decision = await ask({ tool, detail });
      if (decision === "allow_always") {
        allowlist.add(tool);
        return true;
      }
      return decision === "allow_once";
    },
  };
}
