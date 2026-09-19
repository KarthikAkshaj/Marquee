"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { SOURCE_FOR_KIND, SOURCE_NAMES } from "@/lib/add";
import { saveMatches } from "@/lib/actions/match";
import { setItemAccents } from "@/lib/actions/items";
import { accentFromCover } from "@/lib/image/accent-color";
import { blockedReason, claimMatches, matchKey, saveBatches } from "@/lib/match";
import type { ManualTitle } from "@/lib/queries";
import type { SearchKind, SearchResult } from "@/lib/search/types";
import { EXTRAS_PER_SAVE } from "@/lib/validators";
import { MatchBar } from "./MatchBar";
import { MatchDone } from "./MatchDone";
import { MatchPicker } from "./MatchPicker";
import { MatchRow } from "./MatchRow";
import { useMatching, type MatchRowState } from "./useMatching";

type MatchFlowProps = {
  shelf: { id: string; name: string; slug: string; color: string; kind: SearchKind };
  items: ManualTitle[];
  /** "anilist:21" → the title already holding it on this shelf. */
  taken: { key: string; title: string }[];
};

const SAVE_BATCH = 25;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

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
 * and matched, for you to confirm before anything changes. Anime can bring the
 * rest of their series along.
 */
export function MatchFlow({ shelf, items, taken }: MatchFlowProps) {
  const source = SOURCE_FOR_KIND[shelf.kind];
  const matching = useMatching(shelf.kind, items);
  const [openId, setOpenId] = useState<string | null>(null);
  const [keepTitles, setKeepTitles] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState<{ saved: number; added: number } | null>(null);

  const pickOf = (row: MatchRowState) => (row.choice !== null ? row.candidates[row.choice] : null);
  const { holders, conflicts } = claimMatches(
    matching.rows.map((row) => ({ id: row.item.id, title: row.item.title, include: row.include, pick: pickOf(row), extras: row.extras.map((extra) => extra.result) })),
    taken,
  );
  // Seasons another row got to first stay with that row.
  const ownExtras = (row: MatchRowState) => row.extras.filter((extra) => holders.get(matchKey(extra.result))?.rowId === row.item.id);

  const settled = matching.rows.filter((row) => row.state !== "waiting");
  const ready = matching.rows.filter((row) => row.include && row.choice !== null && !conflicts.has(row.item.id));
  const extras = ready.reduce((sum, row) => sum + ownExtras(row).length, 0);
  const open = matching.rows.find((row) => row.item.id === openId) ?? null;

  async function save(rows: MatchRowState[]) {
    const picks = rows.map((row) => ({
      itemId: row.item.id,
      result: row.candidates[row.choice ?? 0],
      extras: ownExtras(row).map(({ result, status }) => ({ result, status })),
    }));
    const saved: { id: string; result: SearchResult }[] = [];
    let added = 0;
    let problems = 0;
    let missed = 0;
    setProgress({ done: 0, total: picks.length });
    for (const batch of saveBatches(picks, SAVE_BATCH, EXTRAS_PER_SAVE)) {
      const result = await saveMatches({ categoryId: shelf.id, keepTitles, matches: batch });
      if (!result.ok) {
        toast.error(result.message);
        break;
      }
      const ok = new Set(result.saved);
      saved.push(...batch.filter((pick) => ok.has(pick.itemId)).map((pick) => ({ id: pick.itemId, result: pick.result })));
      added += result.added;
      missed += result.missed;
      problems += result.taken.length + result.failed.length;
      setProgress({ done: saved.length + problems, total: picks.length });
    }
    setProgress(null);
    matching.forget(saved.map((entry) => entry.id));
    if (problems) toast.error(`${problems} couldn't be updated. They're still in the list.`);
    if (missed) toast.error(`${plural(missed, "season", "seasons")} couldn't be added. Try them from the add panel.`);
    setDone({ saved: saved.length, added });
    void colourIn(saved);
  }

  const summary = done ? `Updated ${plural(done.saved, "title", "titles")}${done.added ? ` and added ${done.added} more` : ""}` : null;
  const back = `/c/${encodeURIComponent(shelf.slug)}`;

  if (matching.rows.length === 0) return <MatchDone shelfName={shelf.name} href={back} summary={summary} />;

  return (
    <div className="flex flex-col gap-4">
      {summary && (
        <p role="status" className="rounded-card border border-completed/30 bg-completed/8 px-4 py-3 text-13 text-text">
          {summary}. The rest are below if you want another look, or{" "}
          <Link href={back} className="text-accent hover:text-accent-bright">
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
            onToggle={(include) => matching.toggle(row.item.id, include)}
            onOpen={() => setOpenId(row.item.id)}
            onSearch={(query) => void matching.research(row.item.id, query)}
          />
        ))}
      </ul>
      <MatchBar
        ready={ready.length}
        extras={extras}
        toCheck={settled.filter((row) => row.choice !== null && !row.sure).length}
        notFound={settled.filter((row) => row.candidates.length === 0).length}
        remaining={matching.remaining}
        total={matching.rows.length}
        keepTitles={keepTitles}
        onKeepTitles={setKeepTitles}
        onSave={() => void save(ready)}
        progress={progress}
      />
      <MatchPicker
        row={open}
        onClose={() => setOpenId(null)}
        sourceName={SOURCE_NAMES[source]}
        kind={shelf.kind}
        categoryColor={shelf.color}
        conflict={open ? (conflicts.get(open.item.id) ?? null) : null}
        withSeries={shelf.kind === "anime"}
        seriesFor={matching.seriesFor}
        blockedBy={(key) => (open ? blockedReason(holders, key, open.item.id) : null)}
        onLoadSeries={matching.loadSeries}
        onChoose={(choice) => open && matching.choose(open.item.id, choice)}
        onSearch={(query) => open && void matching.research(open.item.id, query)}
        onToggleExtra={(title, add) => open && matching.toggleExtra(open.item.id, title, add)}
        onStepExtra={(externalId, direction) => open && matching.stepExtra(open.item.id, externalId, direction)}
      />
    </div>
  );
}
