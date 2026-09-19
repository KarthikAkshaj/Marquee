import { describe, expect, it } from "vitest";
import { buildCategoryCsv } from "@/lib/export";
import { parseImport } from "@/lib/import/parse";
import { statusLabels } from "@/lib/status";
import type { Database } from "@/lib/supabase/database.types";
import { parseDelimited } from "./csv";
import { entryLine, statusFromWord, tableToText, yearIn } from "./table";

type Item = Database["public"]["Tables"]["items"]["Row"];

const parsed = (text: string) => parseImport(text).titles.map(({ title, status, year }) => [title, status, year]);

describe("statusFromWord", () => {
  it("reads other apps' words and every Marquee label", () => {
    expect(statusFromWord("Plan to Watch")).toBe("planned");
    expect(statusFromWord("On-Hold")).toBe("in_progress");
    expect(statusFromWord("✅ Watched")).toBe("completed");
    expect(statusFromWord("Backlog")).toBe("planned");
    expect(statusFromWord("Abandoned")).toBe("dropped");
    expect(statusFromWord("Rewatching")).toBe("in_progress");
    expect(statusFromWord("Great")).toBeNull();
    expect(statusFromWord("")).toBeNull();
  });
});

describe("yearIn", () => {
  it("finds a year in a year, a date or a spreadsheet day number", () => {
    expect(yearIn("2019")).toBe(2019);
    expect(yearIn("2019-05-01")).toBe(2019);
    expect(yearIn("May 3, 1997")).toBe(1997);
    expect(yearIn("43466")).toBe(2019);
    expect(yearIn("12")).toBeNull();
    expect(yearIn("")).toBeNull();
  });
});

describe("entryLine", () => {
  it("writes hints the parser reads back", () => {
    const line = entryLine({ title: "Steins;Gate", status: "in_progress", year: 2011 });
    expect(line).toBe("Steins;Gate (2011) (in progress)");
    expect(parsed(line)).toEqual([["Steins;Gate", "in_progress", 2011]]);
  });
});

describe("tableToText", () => {
  it("picks the title, status and year columns by their headers", () => {
    const text = tableToText([
      ["Rating", "Name", "Year", "My Status"],
      ["9", "Frieren", "2023", "Completed"],
      ["", "Pluto", "", "Plan to Watch"],
      ["", "", "", ""],
      ["8", "Monster", "2004", "On-Hold"],
    ]);
    expect(parsed(text)).toEqual([
      ["Frieren", "completed", 2023],
      ["Pluto", "planned", null],
      ["Monster", "in_progress", 2004],
    ]);
  });

  it("prefers Title over Original Title and Year over Release Date (IMDb)", () => {
    const text = tableToText([
      ["Const", "Original Title", "Title", "Release Date", "Year"],
      ["tt1", "Sen to Chihiro", "Spirited Away", "2001-07-20", "2001"],
    ]);
    expect(parsed(text)).toEqual([["Spirited Away", null, 2001]]);
  });

  it("treats a ticked status-named column as that status (Notion checkboxes)", () => {
    const text = tableToText([
      ["Name", "Watched", "Tags"],
      ["Dune", "Yes", "sci-fi"],
      ["Arrival", "No", ""],
    ]);
    expect(parsed(text)).toEqual([
      ["Dune", "completed", null],
      ["Arrival", null, null],
    ]);
  });

  it("reads a list without a header row: first cell is the title", () => {
    const text = tableToText([
      ["Frieren", "Completed", "2023"],
      ["Pluto", "", ""],
    ]);
    expect(parsed(text)).toEqual([
      ["Frieren", "completed", 2023],
      ["Pluto", null, null],
    ]);
  });

  it("switches to a second header further down (Letterboxd lists)", () => {
    const text = tableToText([
      ["Letterboxd list export v7"],
      ["Position", "Name", "Year", "URL"],
      ["1", "Perfect Days", "2023", "https://boxd.it/x"],
    ]);
    expect(parsed(text)).toEqual([
      ["Letterboxd list export v7", null, null],
      ["Perfect Days", null, 2023],
    ]);
  });

  it("round-trips Marquee's own CSV export", () => {
    const item = (title: string, status: Item["status"], year: number | null) => ({ title, status, year, genres: [] as string[] }) as unknown as Item;
    const csv = buildCategoryCsv(statusLabels("movie"), [item("Dune", "completed", 2021), item("+Anima", "planned", null), item('Say "Hi", Bye', "dropped", 1999)]);
    expect(parsed(tableToText(parseDelimited(csv)))).toEqual([
      ["Dune", "completed", 2021],
      ["+Anima", "planned", null],
      ['Say "Hi", Bye', "dropped", 1999],
    ]);
  });
});

describe("parseDelimited", () => {
  it("handles quotes, doubled quotes, line breaks in cells and a byte-order mark", () => {
    expect(parseDelimited(String.fromCharCode(0xfeff) + 'Title,Notes\r\n"Dune, Part Two","said ""wow""\ntwice"\r\nArrival,\n')).toEqual([
      ["Title", "Notes"],
      ["Dune, Part Two", 'said "wow"\ntwice'],
      ["Arrival", ""],
    ]);
  });

  it("works out semicolons and tabs from the first line", () => {
    expect(parseDelimited("Title;Year\nAmélie;2001")).toEqual([
      ["Title", "Year"],
      ["Amélie", "2001"],
    ]);
    expect(parseDelimited("Title\tYear\nHeat\t1995")).toEqual([
      ["Title", "Year"],
      ["Heat", "1995"],
    ]);
  });
});
