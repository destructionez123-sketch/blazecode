import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { SlashPalette, filterPalette, type PaletteItem } from "./SlashPalette.js";

const ITEMS: PaletteItem[] = [
  { cmd: "/model", desc: "switch the active model" },
  { cmd: "/think", desc: "toggle extended thinking" },
  { cmd: "/skills", desc: "available skills" },
];

describe("filterPalette", () => {
  it("returns all items for an empty query", () => {
    expect(filterPalette(ITEMS, "")).toHaveLength(3);
  });
  it("filters case-insensitively by substring", () => {
    const out = filterPalette(ITEMS, "MOD");
    expect(out).toHaveLength(1);
    expect(out[0]!.cmd).toBe("/model");
  });
  it("returns nothing when no command matches", () => {
    expect(filterPalette(ITEMS, "zzz")).toHaveLength(0);
  });
});

describe("SlashPalette", () => {
  it("renders the selected row with the ❯ marker", () => {
    const { lastFrame } = render(
      <SlashPalette items={ITEMS} query="" selectedIndex={1} />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("❯ /think");
    expect(frame).toContain("/model");
    expect(frame).toContain("available skills");
  });
});
