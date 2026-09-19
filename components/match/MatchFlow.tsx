"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { SOURCE_FOR_KIND, SOURCE_NAMES } from "@/lib/add";
import { saveMatches } from "@/lib/actions/match";
import { setItemAccents } from "@/lib/actions/items";
import { accentFromCover } from "@/lib/image/accent-color";
import type { ManualTitle } from "@/lib/queries";
import type { SearchKind, SearchResult } from "@/lib/search/types";
import { MatchBar } from "./MatchBar";
import { MatchRow } from "./MatchRow";
import { useMatching, type MatchRowState } from "./useMatching";

type MatchFlowProps = {
  shelf: { id: string; name: string; slug: string; color: string; kind: SearchKind };
  items: ManualTitle[];
  /** "anilist:21" → the title already holding it on this shelf. */
  taken: { key: string; title: string }[];
};

const SAVE_BATCH = 25;
const keyOf = (result: SearchResult) => `${result.source}:${result.externalId}`;

/** Works out cover colours for the saved titles in the background, then saves them in one go. */
async function colourIn(saved: { id: string; result: SearchResult }[]) {
  const colors: { id: string; color: string }[] = [];
  for (const { id, result } of saved) {
    if (result.accentColor || !result.coverUrl) continue;
    const color = await accentFromCover(result.coverUrl);
    if (color) colors.push({ id, color });
  }
  for (let start = 0; start < colors.length; start += 100) await setItemAccents(colors.slice(start, start + 100));
}

/**
 * Find covers (SPEC §8.9 step 6): every hand-added title on a shelf, looked up
 * and matched, for you to confirm before anything changes.
 */
export function MatchFlow({ shelf, items, taken }: MatchFlowProps) {
  const source = SOURCE_FOR_KIND[shelf.kind];
  const matching = useMatching(shelf.kind, items);
  const [keepTitles, setKeepTitles] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState<{ saved: number } | null>(null);

  // A search result can sit on a shelf only once: flag picks that clash.
  const holders = new Map(taken.map((entry) => [entry.key, entry.title]));
  const conflicts = new Map<string, string>();
  for (const row of matching.rows) {
    const pick = row.choice !== null ? row.candidates[row.choice] : null;
    if (!pick || !row.include) continue;
    const holder = holders.get(keyOf(pick));
    if (holder) conflicts.set(row.item.id, `Already on this shelf as “${holder}”`);
    else holders.set(keyOf(pick), row.item.title);
  }

  const settled = matching.rows.filter((row) => row.state !== "waiting");
  const ready = matching.rows.filter((row) => row.include && row.choice !== null && !conflicts.has(row.item.id));
  const toCheck = settled.filter((row) => row.choice !== null && !row.sure).length;
  const notFound = settled.filter((row) => row.candidates.length === 0).length;

  async function save(rows: MatchRowState[]) {
    const picks = rows.map((row) => ({ itemId: row.item.id, result: row.candidates[row.choice ?? 0] }));
    const saved: { id: string; result: SearchResult }[] = [];
    let problems = 0;
    setProgress({ done: 0, total: picks.length });
    for (let start = 0; start < picks.length; start += SAVE_BATCH) {
      const batch = picks.slice(start, start + SAVE_BATCH);
      const result = await saveMatches({ categoryId: shelf.id, keepTitles, matches: batch });
      if (!result.ok) {
        toast.error(result.message);
        break;
      }
      const ok = new Set(result.saved);
      saved.push(...batch.filter((pick) => ok.has(pick.itemId)).map((pick) => ({ id: pick.itemId, result: pick.result })));
      problems += result.taken.length + result.failed.length;
      setProgress({ done: start + batch.length, total: picks.length });
    }
    setProgress(null);
    matching.forget(saved.map((entry) => entry.id));
    if (problems) toast.error(`${problems} couldn't be updated. They're still in the list.`);
    setDone({ saved: saved.length });
    void colourIn(saved);
  }

  if (matching.rows.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-[12px] border border-border bg-surface px-5 py-7 surface-highlight md:px-8">
        <p role="status" className="font-mono text-[13px] text-completed">
          {done ? `Updated ${done.saved} ${done.saved === 1 ? "title" : "titles"}` : "Nothing to match"}
        </p>
        <p className="text-14 text-text-muted">Every title on {shelf.name} has its cover and details{done ? " now" : " already"}.</p>
        <Button asChild className="h-11 px-5">
          <Link href={`/c/${encodeURIComponent(shelf.slug)}`}>Back to {shelf.name}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {done && (
        <p role="status" className="rounded-card border border-completed/30 bg-completed/8 px-4 py-3 text-13 text-text">
          Updated {done.saved} {done.saved === 1 ? "title" : "titles"}. The rest are below if you want another look, or{" "}
          <Link href={`/c/${encodeURIComponent(shelf.slug)}`} className="text-accent hover:text-accent-bright">
            go back to {shelf.name}
          </Link>
          .
        </p>
      )}
      <ul aria-label={`Matches from ${SOURCE_NAMES[source]}`} className="overflow-hidden rounded-[12px] border border-border bg-surface">
        {matching.rows.map((row) => (
          <MatchRow
            key={row.item.id}
            row={row}
            source={source}
            categoryColor={shelf.color}
            conflict={conflicts.get(row.item.id) ?? null}
            onChoose={(choice) => matching.choose(row.item.id, choice)}
            onToggle={(include) => matching.toggle(row.item.id, include)}
            onSearch={(query) => void matching.research(row.item.id, query)}
          />
        ))}
      </ul>
      <MatchBar
        ready={ready.length}
        toCheck={toCheck}
        notFound={notFound}
        remaining={matching.remaining}
        total={matching.rows.length}
        keepTitles={keepTitles}
        onKeepTitles={setKeepTitles}
        onSave={() => void save(ready)}
        progress={progress}
      />
    </div>
  );
}
