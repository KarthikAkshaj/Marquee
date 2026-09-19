import { describe, expect, it } from "vitest";
import { buildExport } from "@/lib/export";
import { parseImport } from "@/lib/import/parse";
import type { Database } from "@/lib/supabase/database.types";
import { jsonToLists } from "./json";

type Tables = Database["public"]["Tables"];

const parsed = (text: string) => parseImport(text).titles.map(({ title, status, year }) => [title, status, year]);

describe("jsonToLists", () => {
  it("reads a Marquee backup as one list per shelf", () => {
    const category = (id: string, name: string, kind: Tables["categories"]["Row"]["kind"], position: number) =>
      ({ id, name, kind, position, slug: name.toLowerCase(), color: "amber", icon: "film", created_at: "", user_id: "u" }) as Tables["categories"]["Row"];
    const item = (category_id: string, title: string, status: Tables["items"]["Row"]["status"], year: number | null) =>
      ({ category_id, title, status, year, genres: [] }) as unknown as Tables["items"]["Row"];
    const backup = buildExport(
      { username: "someone", display_name: "Someone", bio: null, avatar_url: null, created_at: "" },
      [category("m", "Movies", "movie", 1), category("a", "Anime", "anime", 0)],
      [item("a", "Frieren", "completed", 2023), item("m", "Dune", "planned", 2021), item("a", "Pluto", "in_progress", null)],
    );
    const lists = jsonToLists(JSON.parse(JSON.stringify(backup)), "marquee.json");
    expect(lists?.map((list) => [list.name, list.kind])).toEqual([
      ["Anime", "anime"],
      ["Movies", "movie"],
    ]);
    expect(parsed(lists?.[0].text ?? "")).toEqual([
      ["Frieren", "completed", 2023],
      ["Pluto", "in_progress", null],
    ]);
  });

  it("finds arrays of titles, of objects with a title, and of nested ones (Trakt, AniList)", () => {
    const lists = jsonToLists(
      {
        favourites: ["Heat", "Ran"],
        watched: [{ plays: 2, movie: { title: "Dune", year: 2021, ids: { imdb: "tt1" } } }],
        anime: { entries: [{ status: "CURRENT", media: { title: { romaji: "Sousou no Frieren", english: "Frieren" } } }] },
        settings: [{ theme: "dark" }],
      },
      "export.json",
    );
    expect(lists?.map((list) => [list.name, parsed(list.text)])).toEqual([
      ["favourites", [["Heat", null, null], ["Ran", null, null]]],
      ["watched", [["Dune", null, 2021]]],
      ["entries", [["Frieren", "in_progress", null]]],
    ]);
  });

  it("names a top-level array after the file, and gives up on JSON with no titles", () => {
    expect(jsonToLists([{ name: "Hades" }], "games.json")?.map((list) => list.name)).toEqual(["games.json"]);
    expect(jsonToLists({ theme: "dark", count: 3 }, "prefs.json")).toBeNull();
  });
});
