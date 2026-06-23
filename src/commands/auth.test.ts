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

  it("recognizes --version and -v", () => {
    expect(parseArgs(["--version"])).toEqual({ command: "version" });
    expect(parseArgs(["-v"])).toEqual({ command: "version" });
  });
  it("recognizes --help and -h", () => {
    expect(parseArgs(["--help"])).toEqual({ command: "help" });
    expect(parseArgs(["-h"])).toEqual({ command: "help" });
  });
  it("reports an unknown command", () => {
    expect(parseArgs(["foo"])).toEqual({ command: "unknown", input: "foo" });
  });
  it("treats `auth` without `login` as unknown", () => {
    expect(parseArgs(["auth"])).toEqual({ command: "unknown", input: "auth" });
  });
});
