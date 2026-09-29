/**
 * For you's "New to you", put together on the server (SPEC §20): the page
 * renders it for the address it was opened at, and /api/picks answers the
 * mood chips afterwards, so both always agree on what's offered.
 */
import { SOURCE_FOR_KIND, SOURCE_NAMES, searchKindOf } from "@/lib/add";
import { moodFilter, type MoodChoice } from "@/lib/moods";
import { getCategories, getDismissedPicks, getTasteItems } from "@/lib/queries";
import {
  backlogPicks,
  moodPicks,
  newPicks,
  offeredShelves,
  seedsOf,
  tasteOf,
  toView,
  type BacklogPick,
  type NewPick,
  type PickShelf,
  type PicksPayload,
  type Seed,
  type Taste,
  type TasteItem,
} from "@/lib/recommend";
import { discoverTitles, getSuggestions, resolveWord, type DiscoverResponse, type SearchError, type SearchKind } from "@/lib/search";

export type PickContext = {
  shelves: PickShelf[];
  /** The shelves the chips offer, in order. */
  offered: PickShelf[];
  library: TasteItem[];
  dismissed: ReadonlySet<string>;
  taste: Taste;
  backlog: BacklogPick[];
  seeds: Map<SearchKind, Seed[]>;
};

/** Everything the picks are worked out from: three reads, side by side. */
export async function loadPickContext(): Promise<PickContext> {
  const [categories, library, dismissed] = await Promise.all([getCategories(), getTasteItems(), getDismissedPicks()]);
  const shelves: PickShelf[] = categories.map(({ id, name, slug, kind, color }) => ({ id, name, slug, kind, color }));
  const taste = tasteOf(library, { dismissed: dismissed.about });
  const backlog = backlogPicks(library, taste);
  const seeds = seedsOf(library, shelves);
  return { shelves, offered: offeredShelves(shelves, backlog, seeds), library, dismissed: dismissed.keys, taste, backlog, seeds };
}

const CUSTOM_SHELF = "A shelf of your own has nobody to ask for new titles, so your list above is the lot.";

/** Why a kind's provider gave nothing, in one muted line. */
function problem(kind: SearchKind, error: SearchError): string {
  const name = SOURCE_NAMES[SOURCE_FOR_KIND[kind]];
  return error === "not_configured" ? `${name} isn't set up here yet.` : `${name} isn't answering right now. Try again in a bit.`;
}

/** Each kind's usual picks: what fans of your favourites love. Unlimited, so a mood can look any title up. */
async function recommendedByKind(ctx: PickContext, limit?: number) {
  const kinds = [...ctx.seeds.keys()];
  const answers = await Promise.all(
    kinds.map((kind) => getSuggestions(kind, ctx.seeds.get(kind)!.flatMap((seed) => seed.item.external_id ?? []))),
  );
  return new Map(
    kinds.map((kind, index) => {
      const picks = newPicks({ seeds: ctx.seeds.get(kind)!, answers: answers[index].results, library: ctx.library, dismissed: ctx.dismissed, taste: ctx.taste, limit });
      return [kind, { picks, error: answers[index].error }] as const;
    }),
  );
}

/** "New to you" without a mood: titles fans of your favourites love, on the shelf of the favourite behind each. */
export async function recommendedPicks(ctx: PickContext): Promise<PicksPayload> {
  const byKind = await recommendedByKind(ctx);
  const picks = [...byKind.values()].flatMap((entry) => entry.picks.map(toView));

  const notices: Record<string, string> = {};
  for (const shelf of ctx.offered) {
    const kind = searchKindOf(shelf.kind);
    const error = kind && byKind.get(kind)?.error;
    if (!kind) notices[shelf.id] = CUSTOM_SHELF;
    else if (error) notices[shelf.id] = problem(kind, error);
    else if (!ctx.seeds.has(kind)) notices[shelf.id] = `Rate a few ${shelf.name} titles 8 or more, or star one, and picks show up here.`;
  }
  return { picks, notices };
}

/**
 * A kind's best-rated titles for a mood, or for a typed word once it's been
 * matched to the provider's own genres, tags or keywords. Null when the word
 * means nothing to that provider.
 */
async function discoverFor(kind: SearchKind, choice: NonNullable<MoodChoice>): Promise<DiscoverResponse | null> {
  if (choice.mood) return discoverTitles(moodFilter(choice.mood, kind));
  const word = await resolveWord(kind, choice.word);
  if (word.error) return { results: [], error: word.error };
  return word.filter ? discoverTitles(word.filter) : null;
}

/**
 * "New to you" for a mood or a typed word: each shelf's provider's
 * best-rated titles for it, reordered for you. Needs no favourites, so even a
 * shelf you've never rated gets some.
 */
export async function moodPicksFor(ctx: PickContext, choice: NonNullable<MoodChoice>): Promise<PicksPayload> {
  const kinds = [...new Set(ctx.offered.flatMap((shelf) => searchKindOf(shelf.kind) ?? []))];
  const [recommended, found] = await Promise.all([
    recommendedByKind(ctx, Infinity),
    Promise.all(kinds.map((kind) => discoverFor(kind, choice))),
  ]);
  const foundByKind = new Map(kinds.map((kind, index) => [kind, found[index]]));

  const picks: NewPick[] = [];
  const notices: Record<string, string> = {};
  for (const shelf of ctx.offered) {
    const kind = searchKindOf(shelf.kind);
    const answer = kind ? foundByKind.get(kind) : undefined;
    if (!kind) {
      notices[shelf.id] = CUSTOM_SHELF;
      continue;
    }
    if (!answer) {
      notices[shelf.id] = `Nothing on ${SOURCE_NAMES[SOURCE_FOR_KIND[kind]]} matches “${choice.word}”.`;
      continue;
    }
    if (answer.error) {
      notices[shelf.id] = problem(kind, answer.error);
      continue;
    }
    const shelfPicks = moodPicks({
      found: answer.results,
      recommended: recommended.get(kind)?.picks ?? [],
      categoryId: shelf.id,
      library: ctx.library,
      dismissed: ctx.dismissed,
      taste: ctx.taste,
    });
    if (shelfPicks.length === 0) notices[shelf.id] = "Nothing new here for this mood. You've seen the lot.";
    picks.push(...shelfPicks);
  }
  return { picks: picks.map(toView), notices };
}
