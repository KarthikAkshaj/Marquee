"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { exportCategoryCsv, exportData } from "@/lib/actions/data";
import { downloadFile } from "@/lib/download";
import { ShelfMenu, type MenuShelf } from "./ShelfMenu";

type DataExportProps = { shelves: MenuShelf[]; titleCount: number };

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function ExportCard({ label, title, body, children }: { label: string; title: string; body: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[11px] border border-border bg-surface p-4.5 surface-highlight md:p-5">
      <p className="label-mono tracking-[.12em] text-text-muted">{label}</p>
      <h2 className="font-display text-28 leading-[1.1]">{title}</h2>
      <p className="text-[12.5px] leading-[1.55] text-pretty text-text-muted">{body}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-1.5">{children}</div>
    </section>
  );
}

function Busy({ busy, idle, working }: { busy: boolean; idle: string; working: string }) {
  return (
    <>
      {busy && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.8} />}
      {busy ? working : idle}
    </>
  );
}

/** Settings → Data (SPEC §8.10, handoff §07): everything as JSON, or one shelf as CSV. */
export function DataExport({ shelves, titleCount }: DataExportProps) {
  const [shelfId, setShelfId] = useState(shelves[0]?.id ?? "");
  const [jsonBusy, startJson] = useTransition();
  const [csvBusy, startCsv] = useTransition();

  function exportEverything() {
    startJson(async () => {
      const result = await exportData();
      if (!result.ok) return void toast.error(result.message);
      downloadFile(result.fileName, JSON.stringify(result.data, null, 2), "application/json");
      toast.success("Your data's downloading.");
    });
  }

  function exportShelf() {
    const shelf = shelves.find((candidate) => candidate.id === shelfId);
    if (!shelf) return;
    startCsv(async () => {
      const result = await exportCategoryCsv(shelf.id);
      if (!result.ok) return void toast.error(result.message);
      downloadFile(result.fileName, result.csv, "text/csv;charset=utf-8");
      toast.success(`${shelf.name} is downloading.`);
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ExportCard label="Everything" title="Export everything" body="Every category, title, rating and note as one JSON file. Yours to keep.">
        <Button onClick={exportEverything} disabled={jsonBusy} aria-busy={jsonBusy} className="h-11 gap-2 px-4 text-13 font-semibold shadow-cta-sm md:h-10">
          <Busy busy={jsonBusy} idle="Export JSON" working="Exporting…" />
        </Button>
        <span className="font-mono text-[11px] text-text-muted">
          {plural(titleCount, "title", "titles")} · {plural(shelves.length, "shelf", "shelves")}
        </span>
      </ExportCard>

      <ExportCard label="One category" title="Export a category" body="A spreadsheet-friendly CSV of a single list, statuses in its own words.">
        {shelves.length > 0 ? (
          <>
            <ShelfMenu shelves={shelves} value={shelfId} onChange={setShelfId} label="Category to export" />
            <Button variant="secondary" onClick={exportShelf} disabled={csvBusy} aria-busy={csvBusy} className="h-11 gap-2 px-4 text-13 md:h-10">
              <Busy busy={csvBusy} idle="Export CSV" working="Exporting…" />
            </Button>
          </>
        ) : (
          <p className="text-13 text-text-muted">No categories to export yet.</p>
        )}
      </ExportCard>
    </div>
  );
}
