"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { restoreFinished, restoreShelves, restoreTitles } from "@/lib/actions/restore";
import { batches, readBackup, type RestorePlan } from "@/lib/restore";

/** A backup bigger than this isn't one. Read before anything is parsed. */
const MAX_BYTES = 24 * 1024 * 1024;

const plural = (count: number, one: string, many: string) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

/**
 * Settings → Data: puts a Marquee backup back, with everything the export
 * carries rather than the titles and years the text importer can see.
 *
 * The file is read and reviewed here in the browser, so nothing is uploaded
 * until the person has seen what is in it and said yes.
 */
export function RestoreBackup() {
  const input = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<RestorePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) return void toast.error("That file is too big to be a Marquee backup.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return void toast.error("That file isn't readable JSON.");
    }

    const read = readBackup(parsed);
    if (!read.ok) return void toast.error(read.reason);
    setPlan(read.plan);
    setDone(0);
  }

  async function restore() {
    if (!plan) return;
    setBusy(true);
    setDone(0);

    try {
      const shelves = await restoreShelves(
        plan.shelves.map(({ name, slug, kind, color, icon, position }) => ({ name, slug, kind, color, icon, position })),
      );
      if (!shelves.ok) return void toast.error(shelves.message);

      let added = 0;
      let updated = 0;
      let skipped = 0;
      let written = 0;

      for (const shelf of plan.shelves) {
        const categoryId = shelves.ids[shelf.slug];
        if (!categoryId) continue;

        for (const batch of batches(shelf.items)) {
          const result = await restoreTitles(categoryId, batch);
          if (!result.ok) return void toast.error(result.message);
          added += result.inserted;
          updated += result.updated;
          skipped += result.skipped;
          written += batch.length;
          setDone(written);
        }
      }

      await restoreFinished();
      setPlan(null);
      toast.success(
        [
          added > 0 && `${plural(added, "title", "titles")} back`,
          updated > 0 && `${plural(updated, "title", "titles")} updated`,
          skipped > 0 && `${skipped} skipped`,
        ]
          .filter(Boolean)
          .join(", ") || "Everything in that backup was already on your shelves.",
      );
    } catch {
      toast.error("That stopped partway. Run it again and it picks up where it left off.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[11px] border border-border bg-surface p-4.5 surface-highlight md:p-5">
      <p className="label-mono tracking-[.12em] text-text-muted">Restore</p>
      <h2 className="font-display text-28 leading-[1.1]">Put a backup back</h2>

      {plan ? (
        <>
          <p className="text-[12.5px] leading-[1.55] text-pretty text-text-muted">
            <span className="font-mono tabular-nums text-text">{plural(plan.shelves.length, "shelf", "shelves")}</span>{" "}
            and <span className="font-mono tabular-nums text-text">{plural(plan.titles, "title", "titles")}</span>
            {plan.carries.length > 0 && <>, carrying {plan.carries.join(", ")}</>}.
            {plan.dropped > 0 && (
              <>
                {" "}
                <span className="text-dropped">
                  {plural(plan.dropped, "row", "rows")} couldn&apos;t be read and will be left out.
                </span>
              </>
            )}
          </p>
          <p className="text-[12.5px] leading-[1.55] text-pretty text-text-muted">
            Nothing is deleted. Titles already on your shelves are updated to match the file, the rest are added, and
            anything the backup doesn&apos;t mention is left exactly as it is.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-1.5">
            <Button onClick={restore} disabled={busy}>
              {busy && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.8} />}
              {busy ? "Putting it back" : "Restore it"}
            </Button>
            <Button variant="ghost" onClick={() => setPlan(null)} disabled={busy}>
              Pick another file
            </Button>
            <p aria-live="polite" className="font-mono text-12 tabular-nums text-text-muted">
              {busy ? `${done.toLocaleString()} of ${plan.titles.toLocaleString()}` : "·"}
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12.5px] leading-[1.55] text-pretty text-text-muted">
            The JSON file from Export everything, read back in full: ratings, notes, progress, start and finish dates,
            favourites, cover art and the shelves themselves. Import can only read titles and years out of the same
            file.
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-1.5">
            <Button variant="secondary" onClick={() => input.current?.click()}>
              Choose a backup
            </Button>
            <input
              ref={input}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                void pick(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        </>
      )}
    </section>
  );
}
