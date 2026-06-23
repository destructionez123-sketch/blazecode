import { describe, it, expect } from "vitest";
import { parseSlash, KNOWN_SLASH_COMMANDS } from "./slash.js";

describe("parseSlash", () => {
  it("parses /model with arg", () => {
    expect(parseSlash("/model claude-opus-4-8")).toEqual({ cmd: "model", arg: "claude-opus-4-8" });
  });
  it("parses /think with no arg", () => {
    expect(parseSlash("/think")).toEqual({ cmd: "think" });
  });
  it("returns null for normal text", () => {
    expect(parseSlash("hello there")).toBeNull();
  });

  // Additional coverage
  it("parses /clear with no arg", () => {
    expect(parseSlash("/clear")).toEqual({ cmd: "clear" });
  });
  it("returns null for empty string", () => {
    expect(parseSlash("")).toBeNull();
  });
  it("trims surrounding whitespace and the arg", () => {
    expect(parseSlash("  /model   gpt-4o  ")).toEqual({ cmd: "model", arg: "gpt-4o" });
  });
  it("returns null for an unknown leading-slash command", () => {
    expect(parseSlash("/wat now")).toBeNull();
  });
  it("treats a path-like leading slash as normal text (no data loss)", () => {
    expect(parseSlash("/etc/hosts is weird")).toBeNull();
  });
  it("returns null for a lone slash", () => {
    expect(parseSlash("/")).toBeNull();
  });
  it("exposes the known command list", () => {
    expect(KNOWN_SLASH_COMMANDS).toContain("model");
    expect(KNOWN_SLASH_COMMANDS).toContain("think");
    expect(KNOWN_SLASH_COMMANDS).toContain("help");
  });
});
