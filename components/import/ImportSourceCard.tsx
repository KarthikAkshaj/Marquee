"use client";

import { X } from "lucide-react";
import type { ImportList } from "@/lib/import/read-file";
import { FileDrop } from "./FileDrop";
import { ListMenu } from "./ListMenu";

/** A dropped file and which of its lists is in the paste box. */
export type LoadedFile = { name: string; lists: ImportList[]; index: number };

type ImportSourceCardProps = {
  text: string;
  file: LoadedFile | null;
  onText: (text: string) => void;
  onFile: (name: string, lists: ImportList[]) => void;
  onPickList: (index: number) => void;
  onClearFile: () => void;
};

const count = (text: string) => text.split(/\r\n|\r|\n/).filter((line) => line.trim()).length;

/**
 * STEP 02 (handoff §05): paste the list, or drop a file. A dropped file's
 * text lands in the paste box, so it can be tidied before review; a file with
 * several lists (a backup, a zip, a workbook) gets a picker above the box.
 */
export function ImportSourceCard({ text, file, onText, onFile, onPickList, onClearFile }: ImportSourceCardProps) {
  const lines = count(text);
  return (
    <section
      aria-labelledby="import-step-2"
      className="flex min-h-0 flex-1 flex-col gap-4 rounded-[12px] border border-border bg-surface px-4 py-4.5 surface-highlight md:px-5.5 md:py-5"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] tracking-[.12em] text-accent">STEP 02</span>
        <h2 id="import-step-2" className="text-[14.5px] font-medium">
          The source
        </h2>
        <span className="text-[12.5px] text-text-muted">Bullets, numbers and stray tabs get stripped.</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_54px_minmax(0,1fr)] md:gap-0">
        <div className="flex min-h-0 flex-col gap-2.25">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="import-paste" className="font-mono text-[10px] tracking-[.12em] text-text-muted">
              PASTE
            </label>
            <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-text-muted">
              {file && (
                <span className="flex min-w-0 items-center gap-1 rounded-full border border-white/8 bg-elevated py-0.5 pr-1 pl-2 text-text">
                  <span className="truncate">{file.name}</span>
                  <button type="button" aria-label="Clear the file" onClick={onClearFile} className="grid size-5 place-items-center rounded-full text-text-muted hover:text-text">
                    <X aria-hidden className="size-3" strokeWidth={2} />
                  </button>
                </span>
              )}
              {lines > 0 && <span className="shrink-0 whitespace-nowrap">{`${lines} ${lines === 1 ? "line" : "lines"}`}</span>}
            </span>
          </div>
          {file && file.lists.length > 1 && <ListMenu lists={file.lists} index={file.index} onPick={onPickList} />}
          <textarea
            id="import-paste"
            value={text}
            onChange={(event) => onText(event.target.value)}
            spellCheck={false}
            placeholder={"Frieren ✓\nVinland Saga (watching)\n- Monster\n\nTo watch:\n1. Pluto"}
            className="min-h-52 flex-1 resize-none rounded-card border border-accent/28 bg-sheet px-4 py-3.5 font-mono text-[12.5px] leading-[1.9] text-text shadow-input-focus outline-none placeholder:text-text-faint focus-visible:border-accent/55 md:min-h-64"
          />
        </div>

        <div aria-hidden className="flex items-center gap-2.5 md:flex-col md:py-4.5">
          <span className="h-px flex-1 bg-linear-to-r from-transparent to-white/12 md:h-auto md:w-px md:bg-linear-to-b" />
          <span className="font-mono text-[10.5px] tracking-[.1em] text-text-muted">OR</span>
          <span className="h-px flex-1 bg-linear-to-l from-transparent to-white/12 md:h-auto md:w-px md:bg-linear-to-t" />
        </div>

        <FileDrop onRead={onFile} />
      </div>
    </section>
  );
}
