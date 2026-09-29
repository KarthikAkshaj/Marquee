import Link from "next/link";
import { ItemCover } from "@/components/items/ItemCover";
import { SOURCE_NAMES } from "@/lib/add";
import type { Disagreement } from "@/lib/stats";

type CrowdRowProps = {
  entry: Disagreement;
  /** Where the title's sheet opens, and its shelf's colour for a generated cover. */
  href: string;
  categoryColor: string;
};

/** Who scored it what, in words. A score that came in by hand has no provider to name. */
function crowdName(source: Disagreement["source"]): string {
  return source === "manual" ? "The crowd" : SOURCE_NAMES[source];
}

/**
 * One argument with the crowd: the title, both scores in words, and both on
 * a 0 to 100 track with a line between them. Yours is amber, theirs is grey,
 * and the words say which is which, so colour never carries it alone. The
 * whole row is the link to the title's sheet, and lights up the moment it's
 * touched, so a tap anywhere on it answers at once.
 */
export function CrowdRow({ entry, href, categoryColor }: CrowdRowProps) {
  const you = entry.rating * 10;
  const low = Math.min(you, entry.community);
  const high = Math.max(you, entry.community);

  return (
    <li>
      <Link
        href={href}
        className="group -mx-2 grid grid-cols-[30px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-card px-2 py-2.5 transition-colors active:bg-white/6 md:grid-cols-[30px_minmax(0,15rem)_minmax(0,1fr)] md:gap-x-4 md:hover:bg-white/3"
      >
        <span className="relative h-11 w-7.5 overflow-hidden rounded-[5px] border border-white/8">
          <ItemCover item={{ id: entry.id, cover_url: entry.coverUrl }} categoryColor={categoryColor} sizes="30px" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-14 text-text transition-colors group-hover:text-accent group-active:text-accent">{entry.title}</span>
          <span className="block font-mono text-[11.5px] text-text-muted">
            You <span className="text-text">{entry.rating}</span> · {crowdName(entry.source)} <span className="text-text">{entry.community}</span>
          </span>
        </span>
        <span aria-hidden className="pointer-events-none relative col-span-2 mx-1 h-3 md:col-span-1">
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
          <span
            className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-accent/40"
            style={{ left: `${low}%`, width: `${high - low}%` }}
          />
          <span
            className="absolute top-1/2 size-2.5 -translate-1/2 rounded-full bg-text-muted ring-2 ring-surface"
            style={{ left: `${entry.community}%` }}
          />
          <span
            className="absolute top-1/2 size-2.5 -translate-1/2 rounded-full bg-accent ring-2 ring-surface"
            style={{ left: `${you}%` }}
          />
        </span>
      </Link>
    </li>
  );
}
