"use client";

import { Loader2 } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { readImportFile } from "@/lib/import/read-file";
import { cn } from "@/lib/utils";

type FileDropProps = {
  /** The file's text and name once it's been read. */
  onRead: (text: string, name: string) => void;
};

/** "Drop .docx here, or browse your files" (handoff §05). Reads in the browser; nothing is uploaded. */
export function FileDrop({ onRead }: FileDropProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setError(null);
    const result = await readImportFile(file);
    setReading(false);
    if (result.ok) onRead(result.text, result.name);
    else setError(result.message);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    void take(event.dataTransfer.files[0]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.25">
      <p className="font-mono text-[10px] tracking-[.12em] text-text-muted">DROP A FILE</p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        aria-describedby={error ? "import-file-error" : undefined}
        className={cn(
          "relative flex min-h-44 flex-1 flex-col items-center justify-center gap-3.5 overflow-hidden rounded-card border border-dashed transition-colors md:min-h-0",
          over ? "border-accent/50 bg-accent/3" : "border-white/18 hover:border-accent/50 hover:bg-accent/3",
        )}
      >
        <span aria-hidden className="glow-amber-soft pointer-events-none absolute -bottom-17.5 left-1/2 h-40 w-75 -translate-x-1/2 blur-[24px]" />
        <span aria-hidden className="relative h-18.5 w-15">
          <span className="absolute top-0 left-2.5 h-14.5 w-11 -rotate-7 rounded-[5px] border border-white/10 bg-white/5" />
          <span className="absolute top-2 left-1 flex h-14.5 w-11 flex-col justify-end gap-1.25 rounded-[5px] border border-accent/28 bg-accent/8 px-2 py-2.25">
            <span className="h-0.5 w-[70%] rounded-xs bg-accent/50" />
            <span className="h-0.5 w-[90%] rounded-xs bg-white/14" />
            <span className="h-0.5 w-[55%] rounded-xs bg-white/14" />
          </span>
        </span>
        <span className="relative text-center">
          {reading ? (
            <span className="flex items-center gap-2 text-14 text-text">
              <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.8} />
              Reading…
            </span>
          ) : (
            <>
              <span className="block text-14 text-text">
                Drop <span className="font-mono text-13 text-accent">.docx</span> here
              </span>
              <span className="mt-1.5 block text-[12.5px] text-text-muted">
                or <span className="text-accent">browse your files</span>
              </span>
            </>
          )}
          <span className="mt-3 block font-mono text-[10.5px] text-text-faint">.DOCX · .TXT · UP TO 5 MB</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept=".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          void take(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error && (
        <p id="import-file-error" role="alert" className="text-13 text-dropped">
          {error}
        </p>
      )}
    </div>
  );
}
