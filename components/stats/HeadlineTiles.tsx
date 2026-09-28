import Link from "next/link";
import { EMPTY } from "@/lib/items";
import { formatAverage, formatCount, type Headline, type StatsShelf } from "@/lib/stats";
import { statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

type Tile = { label: string; value: string; detail: string };

function tiles(numbers: Headline, shelf: StatsShelf | null): Tile[] {
  // A shelf speaks its own verb ("3 watching"); everything together speaks the neutral one.
  const kind = shelf?.kind ?? "custom";
  const list: Tile[] = [
    {
      label: "Titles",
      value: formatCount(numbers.titles),
      detail: `${formatCount(numbers.inProgress)} ${statusLabel(kind, "in_progress").toLowerCase()} · ${formatCount(numbers.planned)} ${statusLabel("custom", "planned").toLowerCase()}`,
    },
    { label: "Finished", value: formatCount(numbers.finished), detail: `${formatCount(numbers.finishedThisYear)} this year` },
    {
      label: "Average score",
      value: numbers.average === null ? EMPTY : formatAverage(numbers.average),
      detail: numbers.rated === 0 ? "nothing rated yet" : `out of 10, from ${formatCount(numbers.rated)} rated`,
    },
  ];
  if (numbers.time) {
    const { hours, episodes, chapters } = numbers.time;
    list.push({
      label: "Hours watched",
      value: formatCount(hours),
      detail: [`roughly · ${formatCount(episodes)} episodes`, chapters > 0 && `${formatCount(chapters)} chapters`].filter(Boolean).join(" · "),
    });
  }
  return list;
}

/** The headline numbers: separate tiles on phones, one joined strip on wider screens, as on Home. */
export function HeadlineTiles({ numbers, shelf }: { numbers: Headline; shelf: StatsShelf | null }) {
  const untimed = numbers.time?.untimed ?? 0;
  const matchable = shelf && (shelf.kind === "anime" || shelf.kind === "series");

  return (
    <section aria-label="In short">
      <ul className="grid grid-cols-2 gap-2.25 md:flex md:gap-0 md:rounded-card md:border md:border-border md:bg-surface">
        {tiles(numbers, shelf).map((tile, index, all) => (
          <li
            key={tile.label}
            className={cn(
              "flex min-w-0 flex-col gap-1.5 rounded-card border border-border bg-surface px-3.5 py-3 surface-highlight",
              "md:flex-1 md:gap-2 md:rounded-none md:border-0 md:border-r md:border-white/5 md:bg-transparent md:px-5 md:py-4.5 md:last:border-r-0",
              // An odd tile out takes the whole row on phones.
              all.length % 2 === 1 && index === all.length - 1 && "col-span-2",
            )}
          >
            <p className="font-mono text-[9.5px] tracking-[.12em] text-text-muted uppercase md:text-[10px]">{tile.label}</p>
            <p className="font-mono text-[26px] leading-none tracking-[-.02em] md:text-[32px]">{tile.value}</p>
            <p className="text-[11.5px] leading-snug text-text-muted md:text-12">{tile.detail}</p>
          </li>
        ))}
      </ul>
      {untimed > 0 && (
        <p className="mt-2.5 text-12 text-text-muted md:text-13">
          Hours leave out {formatCount(untimed)} finished {untimed === 1 ? "show" : "shows"} with no episode count yet.{" "}
          {matchable ? (
            <Link href={`/c/${encodeURIComponent(shelf.slug)}/match`} className="text-accent hover:text-accent-bright">
              Find covers can fill those in.
            </Link>
          ) : (
            "Find covers on each shelf can fill those in."
          )}
        </p>
      )}
    </section>
  );
}
