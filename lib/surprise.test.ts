import { describe, expect, it } from "vitest";
import type { PaletteTitle } from "./palette";
import { pickSurprise, reelFrames, surpriseCandidates } from "./surprise";

const title = (id: string, extra: Partial<PaletteTitle> = {}): PaletteTitle => ({
  id,
  title: id,
  status: "planned",
  year: null,
  cover_url: null,
  accent_color: null,
  source: "manual",
  external_id: null,
  category_id: "anime",
  ...extra,
});

/** A repeatable "random" sequence for the tests. */
function sequence(...values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("Surprise me", () => {
  const titles = [title("a"), title("b", { category_id: "movies" }), title("c"), title("d", { status: "completed" })];

  it("only picks from what's waiting, optionally on one shelf", () => {
    expect(surpriseCandidates(titles, null).map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(surpriseCandidates(titles, "anime").map((t) => t.id)).toEqual(["a", "c"]);
    expect(surpriseCandidates(titles, "games")).toEqual([]);
  });

  it("avoids repeating the last pick unless it's the only one", () => {
    const candidates = surpriseCandidates(titles, "anime");
    expect(pickSurprise(candidates, "a", () => 0)?.id).toBe("c");
    expect(pickSurprise([title("a")], "a", () => 0)?.id).toBe("a");
    expect(pickSurprise([], null)).toBeNull();
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
    expect(frames.map((t) => t.id)).toEqual(["solo", "solo", "solo", "solo", "solo", "solo", "solo"]);
    expect(pickIndex).toBe(4);
  });
});
