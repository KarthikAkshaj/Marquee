import { describe, expect, it } from "vitest";
import { namesContaining, namesMatching, wordForms } from "./words";

describe("wordForms", () => {
  it("tries the word and its plural or singular", () => {
    expect(wordForms("Zombies")).toEqual(["zombies", "zombie"]);
    expect(wordForms("sport")).toEqual(["sport", "sports"]);
    expect(wordForms("time travel")).toEqual(["time travel", "time travels"]);
  });
});

describe("namesMatching", () => {
  const tmdbTv = [
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 10759, name: "Action & Adventure" },
    { id: 37, name: "Western" },
  ];

  it("matches whole names, either half of a paired one, and plurals", () => {
    expect(namesMatching(tmdbTv, "western").map((genre) => genre.id)).toEqual([37]);
    expect(namesMatching(tmdbTv, "Fantasy").map((genre) => genre.id)).toEqual([10765]);
    expect(namesMatching([{ name: "Sport" }], "sports")).toEqual([{ name: "Sport" }]);
  });

  it("never matches part of a name", () => {
    expect(namesMatching([{ name: "military spoof" }, { name: "soviet military" }], "military")).toEqual([]);
    expect(namesMatching(tmdbTv, "action & adventure").map((genre) => genre.id)).toEqual([10759]);
  });
});

describe("namesContaining", () => {
  const tags = ["Time Loop", "Time Manipulation", "Time Skip", "E-Sports", "Ice Sports", "Timeless"];

  it("finds whole words inside names, shortest first", () => {
    expect(namesContaining(tags, "loop")).toEqual(["Time Loop"]);
    expect(namesContaining(tags, "time")).toEqual(["Time Loop", "Time Skip", "Time Manipulation"]);
    expect(namesContaining(tags, "sport")).toEqual(["E-Sports", "Ice Sports"]);
  });

  it("finds nothing for a word that's only part of a word", () => {
    expect(namesContaining(tags, "less")).toEqual([]);
    expect(namesContaining(tags, "heist")).toEqual([]);
  });
});
