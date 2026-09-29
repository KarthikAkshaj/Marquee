/**
 * The picks behind For you (SPEC §20). Pure, like lib/stats: rows in, picks
 * out, so every rule is testable.
 *
 * Your taste is how you rate each genre against your own average. A genre
 * counts for little until a few titles back it, so one 10 doesn't make you a
 * horror fan. Under `TASTE_MIN_RATED` rated titles there's no taste to speak
 * of, and the picks go by the crowd's score instead and say so.
 */
import { SOURCE_FOR_KIND, SOURCE_NAMES, searchKindOf } from "@/lib/add";
import type { Item } from "@/lib/items";
import type { SearchKind, SearchResult, SearchSource, SeedSuggestions, Suggestion } from "@/lib/search/types";
import { formatAverage, GENRE_MIN_RATED, genreNames } from "@/lib/stats";
import { isReading, type CategoryKind } from "@/lib/status";

export type TasteItem = Pick<
  Item,
  | "id"
  | "title"
  | "category_id"
  | "status"
  | "rating"
  | "genres"
  | "community_score"
  | "source"
  | "external_id"
  | "is_favorite"
  | "format"
  | "cover_url"
  | "accent_color"
  | "year"
  | "created_at"
  | "updated_at"
>;

export type PickShelf = { id: string; name: string; slug: string; kind: CategoryKind; color: string };

/** Under this many rated titles, your taste is a guess, and the picks say so. */
export const TASTE_MIN_RATED = 5;

/**
 * Pulls a genre's lean toward nothing until titles back it: one rated title
 * counts a quarter of its difference, nine count three quarters.
 */
const LEAN_SHRINK = 3;

/** How much your taste weighs against the crowd's score. */
const FIT_WEIGHT = 1.5;
const CROWD_WEIGHT = 0.5;
/** How much your favourites pointing at a title weighs, against both. */
const SUPPORT_WEIGHT = 2;

/** A title rated this high, or starred, speaks for your taste. */
export const SEED_RATING = 8;
/** The most titles of one kind whose recommendations are asked for. */
export const SEEDS_PER_KIND = 10;
/** New titles offered per shelf. */
export const NEW_PICKS_SHOWN = 24;

export type GenreTaste = { average: number; rated: number; lean: number };

export type Taste = {
  /** How many titles you've rated. */
  rated: number;
  average: number | null;
  genres: ReadonlyMap<string, GenreTaste>;
};

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function tasteOf(items: readonly Pick<TasteItem, "rating" | "genres">[]): Taste {
  const rated = items.filter((item): item is typeof item & { rating: number } => item.rating !== null);
  if (rated.length === 0) return { rated: 0, average: null, genres: new Map() };

  const average = mean(rated.map((item) => item.rating));
  const tally = new Map<string, number[]>();
  for (const item of rated) {
    for (const name of new Set(item.genres.flatMap(genreNames))) {
      tally.set(name, [...(tally.get(name) ?? []), item.rating]);
    }
  }
  const genres = new Map(
    [...tally.entries()].map(([name, ratings]) => {
      const genreAverage = mean(ratings);
      const lean = (genreAverage - average) * (ratings.length / (ratings.length + LEAN_SHRINK));
      return [name, { average: genreAverage, rated: ratings.length, lean }] as const;
    }),
  );
  return { rated: rated.length, average, genres };
}

/** Enough ratings to call it taste. */
export function knowsTaste(taste: Taste): boolean {
  return taste.rated >= TASTE_MIN_RATED;
}

export type Fit = {
  /** Positive when it's made of genres you rate above your own average. */
  score: number;
  /** The genre pulling hardest for it, when you rate it above average on enough titles. */
  genre: { name: string; average: number } | null;
};

export function fitOf(genres: readonly string[], taste: Taste): Fit {
  const names = [...new Set(genres.flatMap(genreNames))];
  if (names.length === 0) return { score: 0, genre: null };
  const known = names.flatMap((name) => {
    const entry = taste.genres.get(name);
    return entry ? [{ name, ...entry }] : [];
  });
  // Genres you've never rated count as neutral, so they thin the fit out.
  const score = known.reduce((sum, entry) => sum + entry.lean, 0) / names.length;
  const best = known
    .filter((entry) => entry.rated >= GENRE_MIN_RATED && entry.lean > 0)
    .sort((a, b) => b.lean - a.lean || b.rated - a.rated || a.name.localeCompare(b.name))[0];
  return { score, genre: best ? { name: best.name, average: best.average } : null };
}

/**
 * The crowd's score as a nudge: 70 is neutral, each 10 points either way is
 * one step, capped at two. No score at all is a small step down.
 */
export function crowdLean(score: number | null | undefined): number {
  if (score === null || score === undefined) return -0.5;
  return Math.max(-2, Math.min(2, (score - 70) / 10));
}

/** A crowd score worth naming as the reason. */
const CROWD_PRAISE = 75;

export type BacklogPick = { item: TasteItem; reason: string | null };

/**
 * Your Planned titles, best fit first. The reason names the genre you rate
 * highest in it ("You rate Mystery 8.6"), else a crowd score worth
 * mentioning ("AniList 88"), else nothing.
 */
export function backlogPicks(items: readonly TasteItem[], taste: Taste): BacklogPick[] {
  const personal = knowsTaste(taste);
  return items
    .filter((item) => item.status === "planned")
    .map((item) => {
      const fit = personal ? fitOf(item.genres, taste) : { score: 0, genre: null };
      const score = FIT_WEIGHT * fit.score + CROWD_WEIGHT * crowdLean(item.community_score);
      return { item, score, reason: backlogReason(item, fit) };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.item.community_score ?? 0) - (a.item.community_score ?? 0) ||
        // Longest waiting first, then alphabetical, so the order never flickers.
        a.item.created_at.localeCompare(b.item.created_at) ||
        a.item.title.localeCompare(b.item.title),
    )
    .map(({ item, reason }) => ({ item, reason }));
}

function backlogReason(item: TasteItem, fit: Fit): string | null {
  return tasteReason(fit) ?? (item.source === "manual" ? null : crowdReason(item.source, item.community_score));
}

/** "You rate Mystery 8.6", when a genre of it is one you rate above your own average. */
function tasteReason(fit: Fit): string | null {
  return fit.genre ? `You rate ${fit.genre.name} ${formatAverage(fit.genre.average)}` : null;
}

/** "AniList 88", when the crowd's score is worth naming. */
function crowdReason(source: SearchSource, score: number | null | undefined): string | null {
  return score !== null && score !== undefined && score >= CROWD_PRAISE ? `${SOURCE_NAMES[source]} ${score}` : null;
}

export type Seed = { item: TasteItem; weight: number };

/**
 * Your best titles of each kind, whose recommendations are worth asking for:
 * rated `SEED_RATING` or more, or starred. Hand-added titles have nothing to
 * ask about, and neither do an anime shelf's comics and novels (AniList's
 * recommendations are asked for anime only).
 */
export function seedsOf(items: readonly TasteItem[], shelves: readonly PickShelf[]): Map<SearchKind, Seed[]> {
  const kinds = new Map(shelves.map((shelf) => [shelf.id, searchKindOf(shelf.kind)]));
  const byKind = new Map<SearchKind, Seed[]>();

  for (const item of items) {
    const kind = kinds.get(item.category_id);
    if (!kind || item.source !== SOURCE_FOR_KIND[kind] || !item.external_id) continue;
    if (kind === "anime" && isReading(item.format)) continue;
    if (!item.is_favorite && (item.rating === null || item.rating < SEED_RATING)) continue;
    const weight = (item.rating ?? SEED_RATING) / 10 + (item.is_favorite ? 0.2 : 0);
    byKind.set(kind, [...(byKind.get(kind) ?? []), { item, weight }]);
  }

  for (const [kind, seeds] of byKind) {
    byKind.set(
      kind,
      seeds
        .sort((a, b) => b.weight - a.weight || b.item.updated_at.localeCompare(a.item.updated_at) || a.item.id.localeCompare(b.item.id))
        .slice(0, SEEDS_PER_KIND),
    );
  }
  return byKind;
}

const titleKey = (title: string) => title.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export type NewPick = {
  result: SearchResult;
  /** How hard your favourites point at it; nothing for a mood's title they don't. */
  support: number;
  /** The shelf it goes on: the one holding the favourite that points at it hardest. */
  categoryId: string;
  /** Your titles that point at it, strongest first. */
  because: string[];
  reason: string;
};

type NewPicksInput = {
  seeds: readonly Seed[];
  answers: readonly SeedSuggestions[];
  /** Every title you have, on every shelf. */
  library: readonly TasteItem[];
  /** `source:external_id` of every title you've said isn't for you. */
  dismissed: ReadonlySet<string>;
  taste: Taste;
  limit?: number;
};

/**
 * What neither the picks nor a mood offers: anything you have (by provider
 * id, or by name when it came from somewhere else or was typed in), anything
 * you've waved away, and a later season of something you haven't started
 * (only planning it doesn't count).
 */
function leftOut(library: readonly TasteItem[], dismissed: ReadonlySet<string>): (suggestion: Suggestion) => boolean {
  const owned = new Set(library.flatMap((item) => (item.external_id ? [`${item.source}:${item.external_id}`] : [])));
  const begun = new Set(
    library.flatMap((item) => (item.external_id && item.status !== "planned" ? [`${item.source}:${item.external_id}`] : [])),
  );
  const namedFrom = new Map<string, Set<string>>();
  for (const item of library) {
    const key = titleKey(item.title);
    namedFrom.set(key, (namedFrom.get(key) ?? new Set()).add(item.source));
  }
  // The same name from another provider, or typed in, is probably this title.
  const ownedByName = (result: SearchResult) =>
    [result.title, result.altTitle].some((name) => {
      const sources = name ? namedFrom.get(titleKey(name)) : undefined;
      return sources !== undefined && [...sources].some((source) => source !== result.source);
    });

  return ({ result, follows }) => {
    const key = pickKey(result);
    if (owned.has(key) || dismissed.has(key) || ownedByName(result)) return true;
    return Boolean(follows?.length) && !follows!.some((id) => begun.has(`${result.source}:${id}`));
  };
}

/** How a provider's title is known across picks, dismissals and the page: `anilist:21827`. */
export function pickKey(result: Pick<SearchResult, "source" | "externalId">): string {
  return `${result.source}:${result.externalId}`;
}

/** A provider's first answer counts in full, its last half. */
function rankStrength(index: number, count: number): number {
  return 1 - (0.5 * index) / Math.max(count - 1, 1);
}

/**
 * Titles from outside your shelves that the providers' users recommend
 * alongside your favourites. A title several favourites point at beats one
 * that only one does; your genre taste and the crowd's score break it from
 * there. What's left out is `leftOut`'s to say.
 */
export function newPicks({ seeds, answers, library, dismissed, taste, limit = NEW_PICKS_SHOWN }: NewPicksInput): NewPick[] {
  const skip = leftOut(library, dismissed);
  const seedsById = new Map(seeds.map((seed) => [seed.item.external_id, seed]));
  const personal = knowsTaste(taste);
  const found = new Map<string, { result: SearchResult; support: number; from: Map<Seed, number> }>();

  for (const answer of answers) {
    const seed = seedsById.get(answer.seed);
    if (!seed) continue;
    answer.suggestions.forEach((suggestion, index) => {
      if (skip(suggestion)) return;
      const { result } = suggestion;
      const key = pickKey(result);
      const entry = found.get(key) ?? { result, support: 0, from: new Map<Seed, number>() };
      const share = seed.weight * rankStrength(index, answer.suggestions.length);
      entry.support += share;
      entry.from.set(seed, (entry.from.get(seed) ?? 0) + share);
      found.set(key, entry);
    });
  }

  return [...found.values()]
    .map(({ result, support, from }) => {
      const fit = personal ? fitOf(result.genres ?? [], taste).score : 0;
      const score = SUPPORT_WEIGHT * support + FIT_WEIGHT * fit + CROWD_WEIGHT * crowdLean(result.communityScore);
      const backers = [...from.entries()].sort((a, b) => b[1] - a[1] || a[0].item.title.localeCompare(b[0].item.title));
      const because = backers.map(([seed]) => seed.item.title);
      return { result, score, support, categoryId: backers[0][0].item.category_id, because, reason: becauseLine(because) };
    })
    .sort((a, b) => b.score - a.score || b.support - a.support || a.result.title.localeCompare(b.result.title))
    .slice(0, limit)
    .map(({ result, support, categoryId, because, reason }) => ({ result, support, categoryId, because, reason }));
}

/** How much a provider's own order weighs in a mood's list. */
const RANK_WEIGHT = 1;

type MoodPicksInput = {
  /** The provider's best-rated titles for the mood, in its order. */
  found: readonly Suggestion[];
  /** This kind's usual picks: one of your favourites pointing at a title lifts it, and gives it its reason. */
  recommended: readonly NewPick[];
  /** The shelf they'd go on. */
  categoryId: string;
  library: readonly TasteItem[];
  dismissed: ReadonlySet<string>;
  taste: Taste;
  limit?: number;
};

/**
 * A mood's titles, best fit for you first (SPEC §20). The provider's list is
 * already the best rated for the mood; your favourites pointing at a title,
 * your genre taste and the crowd's score reorder it. The reason is why it's
 * near the top: your favourites, else a genre you rate, else the crowd.
 */
export function moodPicks({ found, recommended, categoryId, library, dismissed, taste, limit = NEW_PICKS_SHOWN }: MoodPicksInput): NewPick[] {
  const skip = leftOut(library, dismissed);
  const backed = new Map(recommended.map((pick) => [pickKey(pick.result), pick]));
  const personal = knowsTaste(taste);
  const seen = new Set<string>();

  return found
    .flatMap((suggestion, index) => {
      const key = pickKey(suggestion.result);
      if (seen.has(key) || skip(suggestion)) return [];
      seen.add(key);
      const { result } = suggestion;
      const backer = backed.get(key);
      const fit: Fit = personal ? fitOf(result.genres ?? [], taste) : { score: 0, genre: null };
      const rank = rankStrength(index, found.length);
      const score =
        RANK_WEIGHT * rank + SUPPORT_WEIGHT * (backer?.support ?? 0) + FIT_WEIGHT * fit.score + CROWD_WEIGHT * crowdLean(result.communityScore);
      const reason = backer?.reason ?? tasteReason(fit) ?? crowdReason(result.source, result.communityScore) ?? "One of the best rated";
      return [{ result, score, rank, support: backer?.support ?? 0, categoryId, because: backer?.because ?? [], reason }];
    })
    .sort((a, b) => b.score - a.score || b.rank - a.rank)
    .slice(0, limit)
    .map(({ result, support, categoryId: shelf, because, reason }) => ({ result, support, categoryId: shelf, because, reason }));
}

/** "Because you loved Frieren", "... Frieren and Mushishi", "... Frieren and 2 more". */
export function becauseLine(titles: readonly string[]): string {
  if (titles.length <= 1) return `Because you loved ${titles[0] ?? "something like it"}`;
  if (titles.length === 2) return `Because you loved ${titles[0]} and ${titles[1]}`;
  return `Because you loved ${titles[0]} and ${titles.length - 1} more`;
}

/** A new title as the page shows it: what the provider said, where it would go, and why. */
export type PickView = { key: string; result: SearchResult; categoryId: string; reason: string };

/** What For you's "New to you" shows: the titles, and why a shelf has none, by shelf id. */
export type PicksPayload = { picks: PickView[]; notices: Record<string, string> };

export function toView(pick: NewPick): PickView {
  return { key: pickKey(pick.result), result: pick.result, categoryId: pick.categoryId, reason: pick.reason };
}

/** The shelves For you offers: ones with a Planned title, or a favourite to ask about. */
export function offeredShelves(shelves: readonly PickShelf[], backlog: readonly BacklogPick[], seeds: ReadonlyMap<SearchKind, Seed[]>): PickShelf[] {
  const seeded = new Set([...seeds.values()].flat().map((seed) => seed.item.category_id));
  return shelves.filter((shelf) => seeded.has(shelf.id) || backlog.some((pick) => pick.item.category_id === shelf.id));
}
