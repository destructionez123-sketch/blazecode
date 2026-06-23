import { describe, it, expect } from "vitest";
import { FACES, faceColor, WELCOME_FACE, MASCOT_NAME, type MascotMood } from "./mascot.js";

describe("mascot", () => {
  it("FACES has all five moods", () => {
    const moods: MascotMood[] = ["idle", "thinking", "working", "done", "error"];
    for (const mood of moods) {
      expect(typeof FACES[mood]).toBe("string");
      expect(FACES[mood].length).toBeGreaterThan(0);
    }
  });

  it("faceColor returns a hex string for every mood", () => {
    const moods: MascotMood[] = ["idle", "thinking", "working", "done", "error"];
    for (const mood of moods) {
      expect(faceColor(mood)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("faceColor uses ember for working and error", () => {
    expect(faceColor("working")).toBe("#ff3d3d");
    expect(faceColor("error")).toBe("#ff3d3d");
    expect(faceColor("idle")).not.toBe("#ff3d3d");
  });

  it("WELCOME_FACE is non-empty", () => {
    expect(WELCOME_FACE.length).toBeGreaterThan(0);
    expect(WELCOME_FACE.every((l) => typeof l === "string")).toBe(true);
  });

  it("exposes the mascot name", () => {
    expect(MASCOT_NAME).toBe("Blaze");
  });
});
