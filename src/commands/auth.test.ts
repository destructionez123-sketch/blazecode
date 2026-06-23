import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli.js";

describe("cli arg parsing", () => {
  it("recognizes auth login", () => {
    expect(parseArgs(["auth", "login"])).toEqual({ command: "auth-login" });
  });
  it("recognizes run with prompt", () => {
    expect(parseArgs(["run", "fix the bug"])).toEqual({ command: "run", prompt: "fix the bug" });
  });
  it("defaults to tui", () => {
    expect(parseArgs([])).toEqual({ command: "tui" });
  });
});
