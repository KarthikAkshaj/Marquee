import type { Profile } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Member since · total titles · completed this year (SPEC §8.10). Read-only. */
export function ProfileStats({ stats }: { stats: Profile["stats"] }) {
  const tiles = [
    { label: "Member since", short: "Since", value: stats.memberSince, tone: "" },
    { label: "Total titles", short: "Titles", value: String(stats.totalTitles), tone: "" },
    {
      label: "Completed this year",
      short: "This year",
      value: String(stats.completedThisYear).padStart(3, "0"),
      tone: "text-completed",
    },
  ];

  return (
    <dl className="flex overflow-hidden rounded-[11px] border border-border bg-surface surface-highlight">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex flex-1 flex-col gap-1.25 border-r border-white/5 px-3 py-2.75 last:border-r-0 md:gap-1.5 md:px-4.5 md:py-3.75">
          <dt className="label-mono text-[9px] tracking-[.1em] text-text-muted md:text-[10px] md:tracking-[.12em]">
            <span className="md:hidden">{tile.short}</span>
            <span className="hidden md:inline">{tile.label}</span>
          </dt>
          <dd className={cn("font-mono text-16 leading-none tracking-[-.02em] md:text-[22px]", tile.tone)}>{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}
