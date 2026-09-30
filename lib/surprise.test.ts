import { describe, expect, it } from "vitest";
import type { CategoryKind } from "./status";
import {
  ANY,
  lengthLine,
  nothingLine,
  pickSurprise,
  rankWeight,
  reelFrames,
  surpriseCandidates,
  surpriseWeight,
  type LengthSlug,
  type SurpriseTitle,
} from "./surprise";

const title = (id: string, extra: Partial<SurpriseTitle> = {}): SurpriseTitle => ({
  id,
  title: id,
  year: null,
  cover_url: null,
  accent_color: null,
  category_id: "anime",
  format: null,
  genres: [],
  runtime_minutes: null,
  progress_total: null,
  reason: null,
  weight: 1,
  ...extra,
});

const kinds = new Map<string, CategoryKind>([
  ["anime", "anime"],
  ["movies", "movie"],
  ["series", "series"],
  ["games", "game"],
]);

/** A repeatable "random" sequence for the tests. */
function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

const ids = (list: readonly SurpriseTitle[]) => list.map((entry) => entry.id);

describe("Surprise me", () => {
  const titles = [title("a"), title("b", { category_id: "movies" }), title("c")];

  it("picks from everything, or one shelf", () => {
    expect(ids(surpriseCandidates(titles, ANY, kinds))).toEqual(["a", "b", "c"]);
    expect(ids(surpriseCandidates(titles, { ...ANY, shelf: "anime" }, kinds))).toEqual(["a", "c"]);
    expect(surpriseCandidates(titles, { ...ANY, shelf: "games" }, kinds)).toEqual([]);
  });

  it("avoids repeating the last pick unless it's the only one", () => {
    const candidates = surpriseCandidates(titles, { ...ANY, shelf: "anime" }, kinds);
    expect(pickSurprise(candidates, "a", () => 0)?.id).toBe("c");
    expect(pickSurprise([title("a")], "a", () => 0)?.id).toBe("a");
    expect(pickSurprise([], null)).toBeNull();
  });

  it("leans toward the heavier titles without ruling out the rest", () => {
    const leaning = [title("meh", { weight: 1 }), title("great", { weight: 3 })];
    // The roll runs 0 to 4: the first quarter is "meh", the rest "great".
    expect(pickSurprise(leaning, null, () => 0.2)?.id).toBe("meh");
    expect(pickSurprise(leaning, null, () => 0.3)?.id).toBe("great");
    expect(surpriseWeight(0)).toBe(1);
    expect(surpriseWeight(3)).toBeGreaterThan(surpriseWeight(1));
    // Capped, so one standout can't crowd out everything else.
    expect(surpriseWeight(99)).toBe(surpriseWeight(3));
  });

  it("spins past other covers, lands on the pick, and keeps covers after it", () => {
    const candidates = [title("a"), title("b"), title("c")];
    const { frames, pickIndex } = reelFrames(candidates, candidates[1], 8, sequence(0.1, 0.5, 0.9, 0.4), 3);
    expect(frames).toHaveLength(11);
    expect(pickIndex).toBe(7);
    expect(frames[pickIndex].id).toBe("b");
    expect(frames[pickIndex - 1].id).not.toBe("b");
    for (let index = 1; index < frames.length; index += 1) expect(frames[index].id).not.toBe(frames[index - 1].id);
  });

  it("still makes a reel from a single title", () => {
    const only = title("solo");
    const { frames, pickIndex } = reelFrames([only], only, 5, Math.random, 2);
    expect(ids(frames)).toEqual(["solo", "solo", "solo", "solo", "solo", "solo", "solo"]);
    expect(pickIndex).toBe(4);
  });
});

describe("How long have you got?", () => {
  const library = [
    title("frieren", { format: "tv", progress_total: 28, runtime_minutes: 24 }),
    title("mushishi-special", { format: "special", progress_total: 2, runtime_minutes: 45 }),
    title("cyberpunk", { format: "ona", progress_total: 10, runtime_minutes: 25 }),
    title("your-name", { format: "movie", progress_total: 1, runtime_minutes: 106 }),
    title("oppenheimer", { category_id: "movies", runtime_minutes: 181 }),
    title("short-film", { category_id: "movies", runtime_minutes: 40 }),
    title("the-bear", { category_id: "series", progress_total: 8, runtime_minutes: 30 }),
    title("hades", { category_id: "games" }),
    title("berserk", { format: "manga", progress_total: 380 }),
    title("one-piece", { format: "tv", progress_total: 1100, runtime_minutes: 24 }),
  ];
  const lasting = (length: LengthSlug) => ids(surpriseCandidates(library, { ...ANY, length }, kinds));

  it("an hour: only what you can finish in an hour, never one episode of something long", () => {
    // Cyberpunk is 10 episodes of 25 minutes: over four hours in all, so not an hour.
    expect(lasting("hour")).toEqual(["short-film"]);
  });

  it("an evening: a film of any length, or a run of one to three hours", () => {
    expect(lasting("evening")).toEqual(["mushishi-special", "your-name", "oppenheimer"]);
  });

  it("a weekend: a series you could finish in two days (3 to 12 hours), not a long one", () => {
    // Frieren's 28 episodes are about 11 hours; One Piece is 440.
    expect(lasting("weekend")).toEqual(["frieren", "cyberpunk", "the-bear"]);
  });

  it("just an episode: one episode of any show, however long the show runs", () => {
    expect(lasting("episode")).toEqual(["frieren", "mushishi-special", "cyberpunk", "the-bear", "one-piece"]);
  });

  it("leaves what no clock can time to Any length", () => {
    for (const length of ["hour", "evening", "weekend", "episode"] as const) {
      expect(lasting(length)).not.toContain("hades");
      expect(lasting(length)).not.toContain("berserk");
    }
  });

  it("filters by mood on your titles' own genres", () => {
    const moody = [title("monster", { genres: ["Mystery", "Thriller"] }), title("k-on", { genres: ["Slice of Life", "Comedy"] })];
    expect(ids(surpriseCandidates(moody, { ...ANY, mood: "mystery" }, kinds))).toEqual(["monster"]);
    expect(ids(surpriseCandidates(moody, { ...ANY, mood: "feel-good" }, kinds))).toEqual(["k-on"]);
  });
});

describe("nothingLine", () => {
  it("says which choice leaves nothing, in words", () => {
    expect(nothingLine({ ...ANY, length: "hour" }, null)).toBe("Nothing on your list can be finished in an hour.");
    expect(nothingLine({ shelf: "a", length: "evening", mood: "horror" }, "Anime")).toBe("No Horror on your Anime shelf runs one to three hours.");
    expect(nothingLine({ ...ANY, mood: "romance" }, "Games")).toBe("No Romance on your Games shelf.");
  });

  it("says it of new titles too", () => {
    expect(nothingLine({ ...ANY, length: "hour" }, null, "new")).toBe("Nothing new can be finished in an hour.");
    expect(nothingLine({ shelf: "a", length: null, mood: "horror" }, "Anime", "new")).toBe("No new Horror for your Anime shelf.");
  });
});

describe("rankWeight", () => {
  it("leans to the top of a list sorted for you, and never rules the bottom out", () => {
    const weights = Array.from({ length: 5 }, (_, index) => rankWeight(index, 5));
    expect(weights).toEqual([...weights].sort((a, b) => b - a));
    expect(weights[4]).toBeGreaterThan(0);
    expect(weights[0] / weights[4]).toBeCloseTo(Math.exp(4), 5);
  });
});

describe("lengthLine", () => {
  it("says how long, and 'about' where the runtime is a stand-in", () => {
    expect(lengthLine({ format: "movie", progress_total: 1, runtime_minutes: 106 }, "anime")).toBe("1h 46m");
    expect(lengthLine({ format: null, progress_total: null, runtime_minutes: null }, "movie")).toBe("about 2h");
    expect(lengthLine({ format: "tv", progress_total: 12, runtime_minutes: 24 }, "anime")).toBe("12 eps · 4h 48m");
    expect(lengthLine({ format: "tv", progress_total: 12, runtime_minutes: null }, "anime")).toBe("12 eps · about 5h");
    expect(lengthLine({ format: null, progress_total: null, runtime_minutes: 45 }, "series")).toBe("45 min episodes");
    expect(lengthLine({ format: null, progress_total: null, runtime_minutes: null }, "game")).toBeNull();
  });
});
