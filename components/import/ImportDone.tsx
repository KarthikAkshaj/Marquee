import Link from "next/link";
import { Button } from "@/components/ui/Button";

type ImportDoneProps = {
  added: number;
  skippedDuplicates: number;
  leftOut: number;
  shelf: { name: string; slug: string };
  onAgain: () => void;
};

/** "Imported 143 · skipped 6 duplicates" (SPEC §8.9), then off to the shelf. */
export function ImportDone({ added, skippedDuplicates, leftOut, shelf, onAgain }: ImportDoneProps) {
  const notes = [
    `Imported ${added}`,
    skippedDuplicates > 0 && `skipped ${skippedDuplicates} ${skippedDuplicates === 1 ? "duplicate" : "duplicates"}`,
    leftOut > 0 && `left out ${leftOut}`,
  ].filter(Boolean);

  return (
    <div className="flex flex-col items-start gap-5 rounded-[12px] border border-border bg-surface px-5 py-7 surface-highlight md:px-8 md:py-9">
      <p role="status" className="font-mono text-[13px] text-completed">
        {notes.join(" · ")}
      </p>
      <p className="max-w-120 text-14 leading-[1.6] text-text-muted">
        They&apos;re on your {shelf.name} shelf with the statuses you picked, in the order they were in your list.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button asChild className="h-11 px-5 shadow-cta-sm">
          <Link href={`/c/${encodeURIComponent(shelf.slug)}`}>Open {shelf.name}</Link>
        </Button>
        <Button variant="secondary" onClick={onAgain} className="h-11 px-4.5">
          Import another list
        </Button>
      </div>
    </div>
  );
}
