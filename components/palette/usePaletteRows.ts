"use client";

import { useMetadataSearch } from "@/components/add/useMetadataSearch";
import { SOURCE_FOR_KIND, findDuplicate, searchKindOf, searchNotice } from "@/lib/add";
import { paletteLinks, rankMatches, type PaletteCategory, type PaletteTitle } from "@/lib/palette";
import type { PaletteAction } from "./usePaletteActions";

export const MANUAL = "manual";

type Input = {
  query: string;
  categories: PaletteCategory[];
  titles: PaletteTitle[] | null;
  actions: PaletteAction[];
  target: PaletteCategory | null;
};

/**
 * What the palette lists for a query, in order: your titles, places, actions,
 * then search results for the target shelf and the manual row. With nothing
 * typed it shows recent titles and every place instead.
 */
export function usePaletteRows({ query, categories, titles, actions, target }: Input) {
  const typed = query.trim();
  const shelves = new Map(categories.map((category) => [category.id, category]));
  const known = (titles ?? []).filter((title) => shelves.has(title.category_id));
  const counts = new Map<string, number>();
  for (const title of known) counts.set(title.category_id, (counts.get(title.category_id) ?? 0) + 1);

  const titleRows = (typed ? rankMatches(typed, known, (title) => title.title, 6) : known.slice(0, 5)).flatMap((title) => {
    const shelf = shelves.get(title.category_id);
    return shelf ? [{ value: `title:${title.id}`, title, shelf }] : [];
  });
  const links = paletteLinks(categories);
  const linkRows = typed ? rankMatches(typed, links, (link) => `${link.label} ${link.keywords.join(" ")}`, 5) : links;
  const actionRows = typed ? rankMatches(typed, actions, (action) => `${action.label} ${action.keywords}`, 3) : actions;

  const searchKind = target && typed ? searchKindOf(target.kind) : null;
  const search = useMetadataSearch(searchKind, query);
  const onTarget = target ? known.filter((title) => title.category_id === target.id) : [];
  const addRows = (search.response?.results ?? []).map((result) => ({
    value: `add:${result.source}:${result.externalId}`,
    result,
    duplicate: findDuplicate(result, onTarget),
  }));
  const source = searchKind ? SOURCE_FOR_KIND[searchKind] : null;
  const notice =
    source && typed.length >= 2
      ? searchNotice({ source, query, idle: search.idle, loading: search.loading, resultCount: addRows.length, error: search.response?.error })
      : null;

  const values = [
    ...titleRows.map((row) => row.value),
    ...linkRows.map((link) => link.value),
    ...actionRows.map((action) => action.value),
    ...addRows.map((row) => row.value),
    ...(typed && target ? [MANUAL] : []),
  ];

  return {
    typed,
    titleRows,
    linkRows,
    actionRows,
    addRows,
    /** Titles per shelf, once titles have loaded. */
    counts: titles ? counts : null,
    search,
    source,
    notice,
    values,
  };
}
