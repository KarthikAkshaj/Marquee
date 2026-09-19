"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { importTitles } from "@/lib/actions/import";
import { parseImport, titleKey } from "@/lib/import/parse";
import { importBatches, reviewRows, reviewSummary, savedIndex, type ReviewRow, type SavedTitle } from "@/lib/import/review";
import { statusLabel, type ItemStatus } from "@/lib/status";
import { ImportBar } from "./ImportBar";
import { ImportDone } from "./ImportDone";
import { ImportHeader } from "./ImportHeader";
import { ImportReview } from "./ImportReview";
import { ImportSourceCard } from "./ImportSourceCard";
import { ImportTargetCard, type ImportShelf } from "./ImportTargetCard";

type ImportFlowProps = {
  shelves: ImportShelf[];
  saved: SavedTitle[];
  initialShelfId: string | null;
};

type Done = { added: number; skippedDuplicates: number; leftOut: number };

/** Import from a doc (SPEC §8.9): shelf + default status, the list, review, then save in batches. */
export function ImportFlow({ shelves, saved, initialShelfId }: ImportFlowProps) {
  const [shelfId, setShelfId] = useState(initialShelfId ?? shelves[0]?.id ?? null);
  const [defaultStatus, setDefaultStatus] = useState<ItemStatus>("planned");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [step, setStep] = useState<"source" | "review" | "done">("source");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  const shelf = shelves.find((candidate) => candidate.id === shelfId) ?? null;
  const parsed = useMemo(() => parseImport(text), [text]);
  const index = useMemo(() => savedIndex(saved, shelfId ?? ""), [saved, shelfId]);
  const summary = reviewSummary(rows, index);

  if (!shelf) {
    return (
      <div className="flex flex-col items-start gap-4">
        <ImportHeader step="source" />
        <p className="text-14 text-text-muted">Imports land on a category, and you don&apos;t have one yet.</p>
        <Button asChild>
          <Link href="/settings/categories?new=1">Make a category</Link>
        </Button>
      </div>
    );
  }

  function toReview() {
    setRows(reviewRows(parsed.titles, defaultStatus, index, skipDuplicates));
    setStep("review");
    window.scrollTo({ top: 0 });
  }

  function onSkipDuplicates(skip: boolean) {
    setSkipDuplicates(skip);
    setRows((current) => current.map((row) => (index.has(titleKey(row.title)) ? { ...row, include: !skip } : row)));
  }

  async function runImport(target: ImportShelf) {
    const batches = importBatches(summary.ready);
    const total = summary.ready.length;
    const startedAt = new Date().toISOString();
    let added = 0;
    setProgress({ done: 0, total });
    for (const titles of batches) {
      const result = await importTitles({ categoryId: target.id, startedAt, titles });
      if (!result.ok) {
        // Keep what's left in the table so trying again doesn't double anything up.
        const imported = new Set(summary.ready.slice(0, added).map((row) => row.key));
        setRows((current) => current.filter((row) => !imported.has(row.key)));
        setProgress(null);
        toast.error(added ? `${result.message} ${added} made it in; the rest are still here.` : result.message);
        return;
      }
      added += result.added;
      setProgress({ done: added, total });
    }
    setProgress(null);
    setDone({ added, skippedDuplicates: summary.skippedDuplicates, leftOut: summary.leftOut });
    setStep("done");
    window.scrollTo({ top: 0 });
  }

  function startOver() {
    setText("");
    setFileName(null);
    setRows([]);
    setDone(null);
    setStep("source");
  }

  return (
    <div className="flex flex-col gap-5.5">
      <ImportHeader step={step} />

      {step === "source" && (
        <>
          <ImportTargetCard
            shelves={shelves}
            shelfId={shelfId}
            onShelf={setShelfId}
            kind={shelf.kind}
            status={defaultStatus}
            onStatus={setDefaultStatus}
          />
          <ImportSourceCard
            text={text}
            fileName={fileName}
            onText={setText}
            onFile={(fileText, name) => {
              setText(fileText);
              setFileName(name);
            }}
            onClearFile={() => {
              setText("");
              setFileName(null);
            }}
          />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p aria-live="polite" className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span aria-hidden className="size-1.75 rounded-full bg-completed shadow-[0_0_10px_var(--color-completed)]" />
              <span className="font-mono text-[12.5px] text-text">
                {parsed.titles.length} {parsed.titles.length === 1 ? "title" : "titles"}
              </span>
              <span className="text-[12.5px] text-text-muted">
                headed for {shelf.name} · {statusLabel(shelf.kind, defaultStatus)}
                {parsed.repeats > 0 && ` · ${parsed.repeats} repeated ${parsed.repeats === 1 ? "line" : "lines"} dropped`}
              </span>
            </p>
            <Button variant="secondary" onClick={toReview} disabled={parsed.titles.length === 0} className="h-11 gap-2.25 px-5 text-[13.5px] font-medium">
              Review {parsed.titles.length} {parsed.titles.length === 1 ? "title" : "titles"} <span aria-hidden className="font-mono text-12">→</span>
            </Button>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          <ImportReview
            shelf={shelf}
            shelves={shelves}
            sourceName={fileName ?? "Pasted list"}
            rows={rows}
            index={index}
            defaultStatus={defaultStatus}
            onRows={setRows}
            onChangeSource={() => setStep("source")}
          />
          <ImportBar
            ready={summary.ready.length}
            duplicates={summary.duplicateCount}
            skipDuplicates={skipDuplicates}
            onSkipDuplicates={onSkipDuplicates}
            onBack={() => setStep("source")}
            onImport={() => void runImport(shelf)}
            progress={progress}
          />
        </>
      )}

      {step === "done" && done && <ImportDone {...done} shelf={shelf} onAgain={startOver} />}
    </div>
  );
}
