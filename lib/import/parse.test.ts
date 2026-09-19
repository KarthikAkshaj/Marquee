import { describe, expect, it } from "vitest";
import { parseImport, titleKey } from "./parse";

const titles = (text: string) => parseImport(text).titles.map((t) => t.title);

describe("parseImport", () => {
  it("takes one title per non-empty line and strips bullets and numbering", () => {
    const text = [
      "- Frieren",
      "• Vinland Saga",
      "* Mushishi",
      "1. Monster",
      "2) Ping Pong the Animation",
      "(3) Mob Psycho 100",
      "#4 Haikyu!!",
      "",
      "   ",
      "\tDorohedoro\t",
      "— Dungeon Meshi",
    ].join("\n");
    expect(titles(text)).toEqual([
      "Frieren",
      "Vinland Saga",
      "Mushishi",
      "Monster",
      "Ping Pong the Animation",
      "Mob Psycho 100",
      "Haikyu!!",
      "Dorohedoro",
      "Dungeon Meshi",
    ]);
  });

  it("keeps titles that merely start with a number or letter", () => {
    expect(titles("1917\n86 Eighty-Six\n2001: A Space Odyssey\nA Silent Voice\nK-On!")).toEqual([
      "1917",
      "86 Eighty-Six",
      "2001: A Space Odyssey",
      "A Silent Voice",
      "K-On!",
    ]);
  });

  it("reads checkboxes and inline hints, and removes them from the title", () => {
    const { titles: parsed } = parseImport(
      [
        "[x] Frieren",
        "[ ] Monster",
        "- [X] Mushishi",
        "Cowboy Bebop ✓",
        "✔ Samurai Champloo",
        "Vinland Saga (watching)",
        "Hades (Playing)",
        "Berserk (dropped)",
        "Spy x Family (done)",
        "Blue Eye Samurai (completed)",
        "Pluto [watched]",
      ].join("\n"),
    );
    expect(parsed.map((t) => [t.title, t.status])).toEqual([
      ["Frieren", "completed"],
      ["Monster", null],
      ["Mushishi", "completed"],
      ["Cowboy Bebop", "completed"],
      ["Samurai Champloo", "completed"],
      ["Vinland Saga", "in_progress"],
      ["Hades", "in_progress"],
      ["Berserk", "dropped"],
      ["Spy x Family", "completed"],
      ["Blue Eye Samurai", "completed"],
      ["Pluto", "completed"],
    ]);
  });

  it("lets section headers set the status until the next header, and never imports them", () => {
    const { titles: parsed } = parseImport(
      [
        "Watched:",
        "- Frieren",
        "- Monster (dropped)",
        "Currently watching:",
        "One Piece",
        "To watch:",
        "Pluto",
        "Anime:",
        "Mushishi",
        "Plan to watch:",
        "Dorohedoro",
      ].join("\n"),
    );
    expect(parsed.map((t) => [t.title, t.status])).toEqual([
      ["Frieren", "completed"],
      ["Monster", "dropped"],
      ["One Piece", "in_progress"],
      ["Pluto", "planned"],
      ["Mushishi", null],
      ["Dorohedoro", "planned"],
    ]);
  });

  it("takes a trailing (year) as the release year", () => {
    const { titles: parsed } = parseImport("Perfect Blue (1997)\nAkira [1988]\nThe Year 2000 Problem\nDune (2021) (watched)");
    expect(parsed.map((t) => [t.title, t.year, t.status])).toEqual([
      ["Perfect Blue", 1997, null],
      ["Akira", 1988, null],
      ["The Year 2000 Problem", null, null],
      ["Dune", 2021, "completed"],
    ]);
  });

  it("drops repeats within the list, ignoring case and spacing, and counts them", () => {
    const result = parseImport("Frieren\nfrieren\n- FRIEREN  \nMonster\nMonster (watched)");
    expect(result.titles.map((t) => t.title)).toEqual(["Frieren", "Monster"]);
    expect(result.repeats).toBe(3);
  });

  it("keeps the source line numbers and caps very long titles", () => {
    const result = parseImport(`\n\nFrieren\n${"x".repeat(250)}`);
    expect(result.titles[0].line).toBe(3);
    expect(result.titles[1].title).toHaveLength(200);
  });

  it("handles Windows line endings and a 100-line list with mixed hints", () => {
    const lines = Array.from({ length: 100 }, (_, i) => {
      if (i % 10 === 0) return `${i + 1}. Title ${i} ✓`;
      if (i % 10 === 1) return `- Title ${i} (watching)`;
      if (i % 10 === 2) return `[x] Title ${i}`;
      return `• Title ${i}`;
    });
    const result = parseImport(lines.join("\r\n"));
    expect(result.titles).toHaveLength(100);
    expect(result.titles.filter((t) => t.status === "completed")).toHaveLength(20);
    expect(result.titles.filter((t) => t.status === "in_progress")).toHaveLength(10);
    expect(result.titles.every((t) => /^Title \d+$/.test(t.title))).toBe(true);
  });

  it("makes a stable key for matching saved titles", () => {
    expect(titleKey("  Frieren:   Beyond ")).toBe(titleKey("frieren: beyond"));
  });
});
