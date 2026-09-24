import { describe, expect, it } from "vitest";
import { MAX_SHELVES, batches, matchKey, readBackup, type RestoreItem } from "@/lib/restore";

const COVER = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1-abc.jpg";

function item(overrides: Record<string, unknown> = {}) {
  return { title: "A Title", status: "planned", ...overrides };
}

function backup(categories: unknown[]) {
  return { app: "marquee", version: 1, exportedAt: "2026-09-24T10:00:00.000Z", categories };
}

function shelf(items: unknown[], overrides: Record<string, unknown> = {}) {
  return { name: "Anime", slug: "anime", kind: "anime", color: "crimson", icon: "tv", position: 0, items, ...overrides };
}

/** The parse succeeded, so the test can reach into the plan without a guard. */
function plan(value: unknown) {
  const read = readBackup(value);
  if (!read.ok) throw new Error(`expected a readable backup, got: ${read.reason}`);
  return read.plan;
}

describe("readBackup", () => {
  it("turns away anything that isn't a Marquee backup", () => {
    for (const value of [null, 42, "marquee", {}, { app: "other", version: 1, categories: [] }, { app: "marquee" }]) {
      expect(readBackup(value).ok).toBe(false);
    }
  });

  it("keeps every field the export carries, not just title and status", () => {
    const full = item({
      title: "Frieren",
      status: "completed",
      rating: 10,
      progress_current: 28,
      progress_total: 28,
      notes: "the one that got me back into anime",
      is_favorite: true,
      year: 2023,
      started_at: "2026-01-02",
      finished_at: "2026-03-04",
      cover_url: COVER,
      accent_color: "#BBF1A1",
      genres: ["Adventure", "Drama"],
      community_score: 91,
      runtime_minutes: 24,
      format: "tv",
      source: "anilist",
      external_id: "154587",
      created_at: "2026-01-01T09:00:00.000Z",
    });

    const [restored] = plan(backup([shelf([full])])).shelves[0].items;

    expect(restored).toMatchObject({
      title: "Frieren",
      rating: 10,
      progress_current: 28,
      notes: "the one that got me back into anime",
      is_favorite: true,
      started_at: "2026-01-02",
      finished_at: "2026-03-04",
      genres: ["Adventure", "Drama"],
      runtime_minutes: 24,
      format: "tv",
      external_id: "154587",
    });
    // Hex is normalised on the way in, as everywhere else in the app.
    expect(restored.accent_color).toBe("#bbf1a1");
  });

  it("drops one unreadable title instead of refusing the whole file", () => {
    const read = plan(backup([shelf([item(), { title: "" }, item({ title: "Second" })])]));

    expect(read.shelves[0].items.map((row) => row.title)).toEqual(["A Title", "Second"]);
    expect(read.titles).toBe(2);
    expect(read.dropped).toBe(1);
  });

  it("keeps a title whose extras are wrong, and forgets only the extras", () => {
    const [restored] = plan(
      backup([shelf([item({ rating: 99, year: 12, community_score: -4, notes: "x".repeat(5000), status: "nonsense" })])]),
    ).shelves[0].items;

    expect(restored.title).toBe("A Title");
    expect(restored.rating).toBeNull();
    expect(restored.year).toBeNull();
    expect(restored.community_score).toBeNull();
    expect(restored.notes).toBeNull();
    // An unreadable status still has to be something the column accepts.
    expect(restored.status).toBe("planned");
  });

  it("refuses artwork that doesn't come from a provider we already allow", () => {
    const [restored] = plan(
      backup([shelf([item({ cover_url: "https://example.com/evil.jpg", backdrop_url: "javascript:alert(1)" })])]),
    ).shelves[0].items;

    expect(restored.cover_url).toBeNull();
    expect(restored.backdrop_url).toBeNull();
  });

  it("rebuilds a slug two shelves both claim, so neither collides on write", () => {
    const read = plan(backup([shelf([item()], { name: "Anime" }), shelf([item()], { name: "Anime", slug: "anime" })]));

    expect(read.shelves.map((s) => s.slug)).toEqual(["anime", "anime-2"]);
  });

  it("builds a slug from the name when the file has none", () => {
    expect(plan(backup([shelf([item()], { name: "Big Screen: Classics", slug: null })])).shelves[0].slug).toBe(
      "big-screen-classics",
    );
  });

  it("promises only the extras this particular file has", () => {
    const bare = plan(backup([shelf([item()])])).carries;
    expect(bare).toEqual([]);

    const rich = plan(backup([shelf([item({ rating: 8, notes: "good", is_favorite: true, cover_url: COVER })])])).carries;
    expect(rich).toEqual(["ratings", "notes", "favourites", "cover art"]);
  });

  it("turns away a file with no shelves, or more shelves than a library has", () => {
    expect(readBackup(backup([])).ok).toBe(false);
    expect(readBackup(backup(Array.from({ length: MAX_SHELVES + 1 }, () => shelf([item()])))).ok).toBe(false);
  });

  it("survives a shelf whose items are missing entirely", () => {
    const read = plan(backup([shelf([item()]), shelf(undefined as never, { name: "Empty", slug: "empty" })]));
    expect(read.shelves[1].items).toEqual([]);
    expect(read.titles).toBe(1);
  });
});

describe("matchKey", () => {
  it("matches on the provider link when there is one, so a rename still finds it", () => {
    const key = matchKey({ source: "anilist", external_id: "154587", title: "Frieren" });
    expect(key).toBe("anilist:154587");
    expect(matchKey({ source: "anilist", external_id: "154587", title: "Renamed" })).toBe(key);
  });

  it("falls back to the title, case and space insensitive, when there is no link", () => {
    expect(matchKey({ source: "manual", external_id: null, title: "  Death Note " })).toBe("title:death note");
    // A manual row keeps no usable link even if the file claims one.
    expect(matchKey({ source: "manual", external_id: "99", title: "Death Note" })).toBe("title:death note");
  });
});

describe("batches", () => {
  it("splits titles into writes the database will accept, and never an empty one", () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({ title: `T${i}` }) as RestoreItem);
    expect(batches(rows, 100).map((chunk) => chunk.length)).toEqual([100, 100, 50]);
    expect(batches([], 100)).toEqual([]);
  });
});
