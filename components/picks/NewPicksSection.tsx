import { SOURCE_FOR_KIND, SOURCE_NAMES, searchKindOf } from "@/lib/add";
import { getDismissedPicks } from "@/lib/queries";
import { newPicks, type PickShelf, type Seed, type Taste, type TasteItem } from "@/lib/recommend";
import { getSuggestions, type SearchError, type SearchKind } from "@/lib/search";
import { NewPicks } from "./NewPicks";

type NewPicksSectionProps = {
  /** The shelves the chips offer, in order. */
  shelves: readonly PickShelf[];
  seeds: ReadonlyMap<SearchKind, Seed[]>;
  library: readonly TasteItem[];
  taste: Taste;
};

/** Why a kind's providers gave nothing, in one muted line. */
function problem(kind: SearchKind, error: SearchError): string {
  const name = SOURCE_NAMES[SOURCE_FOR_KIND[kind]];
  return error === "not_configured" ? `${name} isn't set up here yet.` : `${name} isn't answering right now. Try again in a bit.`;
}

/**
 * Asks each provider about your favourites of its kind, at the same time, and
 * ranks what comes back (SPEC §20). Streams in after the rest of the page:
 * cached answers take a moment, fresh ones a second or two.
 */
export async function NewPicksSection({ shelves, seeds, library, taste }: NewPicksSectionProps) {
  const kinds = [...seeds.keys()];
  const [dismissed, answers] = await Promise.all([
    getDismissedPicks(),
    Promise.all(kinds.map((kind) => getSuggestions(kind, seeds.get(kind)!.flatMap((seed) => seed.item.external_id ?? [])))),
  ]);

  const picks = kinds.flatMap((kind, index) =>
    newPicks({ seeds: seeds.get(kind)!, answers: answers[index].results, library, dismissed, taste }).map((pick) => ({
      key: `${pick.result.source}:${pick.result.externalId}`,
      result: pick.result,
      categoryId: pick.categoryId,
      reason: pick.reason,
    })),
  );

  const errors = new Map<SearchKind, SearchError>();
  kinds.forEach((kind, index) => {
    const error = answers[index].error;
    if (error) errors.set(kind, error);
  });

  const notices: Record<string, string> = {};
  for (const shelf of shelves) {
    const kind = searchKindOf(shelf.kind);
    const error = kind && errors.get(kind);
    if (!kind) notices[shelf.id] = "A shelf of your own has nobody to ask for new titles, so your list above is the lot.";
    else if (error) notices[shelf.id] = problem(kind, error);
    else if (!seeds.has(kind)) notices[shelf.id] = `Rate a few ${shelf.name} titles 8 or more, or star one, and picks show up here.`;
  }

  return <NewPicks picks={picks} shelves={shelves} notices={notices} />;
}
