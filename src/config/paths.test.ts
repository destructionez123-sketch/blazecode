import { describe, it, expect } from "vitest";
import { authFilePath, sessionsDir, globalConfigPath } from "./paths.js";

describe("paths", () => {
  it("auth file lives under config dir named auth.json", () => {
    expect(authFilePath().endsWith("auth.json")).toBe(true);
  });
  it("sessions dir ends with sessions", () => {
    expect(sessionsDir().endsWith("sessions")).toBe(true);
  });
  it("global config ends with blaze.json", () => {
    expect(globalConfigPath().endsWith("blaze.json")).toBe(true);
  });
});
