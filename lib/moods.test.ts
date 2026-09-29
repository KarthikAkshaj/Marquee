import { describe, expect, it } from "vitest";
import { MOODS, cleanMoodWord, fitsMood, forYouHref, moodFilter, moodLabel, moodParam, readMood } from "@/lib/moods";

describe("MOODS", () => {
  it("has a unique slug, and a filter for every provider", () => {
    expect(new Set(MOODS.map((mood) => mood.slug)).size).toBe(MOODS.length);
    for (const mood of MOODS) {
      // AniList ANDs genres with tags, so each mood asks for one or the other.
      expect(Boolean(mood.anilist.genres?.length) !== Boolean(mood.anilist.tags?.length)).toBe(true);
      for (const filter of [mood.tmdbMovie, mood.tmdbTv, mood.igdb]) {
        expect(Object.values(filter).flat().length).toBeGreaterThan(0);
      }
    }
  });

  it("gives no two moods the same typed word", () => {
    const words = MOODS.flatMap((mood) => [...new Set([mood.slug, ...mood.words])]);
    expect(new Set(words).size).toBe(words.length);
  });
});

describe("cleanMoodWord", () => {
  it("keeps a word as For you stores it", () => {
    expect(cleanMoodWord("  Time   Travel ")).toBe("time travel");
    expect(cleanMoodWord("rom-com")).toBe("rom-com");
    expect(cleanMoodWord("Mahō shōjo")).toBe("mahō shōjo");
  });

  it("refuses nothing, one letter, too much, or odd characters", () => {
    expect(cleanMoodWord(null)).toBeNull();
    expect(cleanMoodWord(" a ")).toBeNull();
    expect(cleanMoodWord("x".repeat(41))).toBeNull();
    expect(cleanMoodWord("war\"; drop")).toBeNull();
    expect(cleanMoodWord("<script>")).toBeNull();
  });
});

describe("readMood", () => {
  it("reads a slug or a word that means a mood as that mood", () => {
    expect(readMood("war")?.mood?.label).toBe("War & military");
    expect(readMood("Military")?.mood?.slug).toBe("war");
    expect(readMood("cozy")?.mood?.slug).toBe("feel-good");
  });

  it("keeps any other word as the word itself", () => {
    expect(readMood("Heist")).toEqual({ mood: null, word: "heist" });
    expect(readMood("")).toBeNull();
  });

  it("round-trips through the URL and names itself", () => {
    expect(moodParam(readMood("military"))).toBe("war");
    expect(moodParam(readMood("heist"))).toBe("heist");
    expect(moodParam(null)).toBeNull();
    expect(moodLabel(readMood("romantic")!)).toBe("Romance");
    expect(moodLabel(readMood("heist")!)).toBe("“heist”");
  });
});

describe("fitsMood", () => {
  it("matches a mood by its genres, whichever provider spelled them", () => {
    expect(fitsMood(["War & Politics", "Drama"], readMood("war"))).toBe(true);
    expect(fitsMood(["Action & Adventure"], readMood("action"))).toBe(true);
    expect(fitsMood(["Science Fiction"], readMood("sci-fi"))).toBe(true);
    expect(fitsMood(["Drama"], readMood("war"))).toBe(false);
  });

  it("matches a typed word against whole words in your genres", () => {
    expect(fitsMood(["Slice of Life"], readMood("life"))).toBe(true);
    expect(fitsMood(["Psychological"], readMood("psych"))).toBe(false);
    expect(fitsMood(["Thriller"], readMood("heist"))).toBe(false);
  });

  it("lets everything through without a mood", () => {
    expect(fitsMood([], null)).toBe(true);
  });
});

describe("moodFilter", () => {
  it("asks each kind of shelf's provider for its own ids", () => {
    const war = readMood("war")!.mood!;
    expect(moodFilter(war, "anime")).toEqual({ kind: "anime", anilist: { tags: ["Military", "War"] } });
    expect(moodFilter(war, "movie")).toEqual({ kind: "movie", tmdb: { genres: [10752] } });
    expect(moodFilter(war, "series")).toEqual({ kind: "series", tmdb: { genres: [10768] } });
    expect(moodFilter(war, "game")).toEqual({ kind: "game", igdb: { themes: [39] } });
  });
});

describe("forYouHref", () => {
  it("leaves out what isn't set and escapes the rest", () => {
    expect(forYouHref({})).toBe("/for-you");
    expect(forYouHref({ shelf: "anime" })).toBe("/for-you?shelf=anime");
    expect(forYouHref({ shelf: "movies", mood: "time travel" })).toBe("/for-you?shelf=movies&mood=time+travel");
    expect(forYouHref({ mood: "war" })).toBe("/for-you?mood=war");
  });
});
