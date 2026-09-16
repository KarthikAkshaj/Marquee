import { Star } from "lucide-react";
import Link from "next/link";
import { progressLabel, type Item } from "@/lib/items";
import type { CategoryKind } from "@/lib/status";
import { ItemCover } from "./ItemCover";
import { StatusPill } from "./StatusPill";

type ItemRowProps = {
  item: Item;
  href: string;
  kind: CategoryKind;
  categoryColor: string;
};

/** Dense list row (SPEC §8.5): 40×60 thumb, title, year, status, progress, rating, updated. */
export function ItemRow({ item, href, kind, categoryColor }: ItemRowProps) {
  const progress = item.progress_total || item.progress_current ? progressLabel(item) : "—";
  const rating = item.rating ? `${item.rating} / 10` : "—";

  return (
    <Link
      href={href}
      scroll={false}
      className="grid min-h-19 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-card px-2 py-2 transition-colors hover:bg-white/4 md:grid-cols-[40px_minmax(0,1fr)_140px_80px_72px_96px] md:gap-5"
    >
      <div className="relative h-15 w-10 overflow-hidden rounded-[5px] border border-white/7">
        <ItemCover item={item} categoryColor={categoryColor} sizes="40px" />
      </div>

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-14 font-medium">
          <span className="truncate">{item.title}</span>
          {item.is_favorite && (
            <Star aria-label="Favourite" className="size-3 shrink-0 fill-accent text-accent" strokeWidth={1.5} />
          )}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-text-muted">
          {item.year ?? "—"}
          <span className="md:hidden">
            {progress !== "—" && ` · ${progress}`}
            {item.rating && ` · ${rating}`}
          </span>
        </p>
      </div>

      <StatusPill kind={kind} status={item.status} className="justify-self-end md:justify-self-start" />
      <span className="hidden font-mono text-13 text-text-muted md:block">{progress}</span>
      <span className="hidden font-mono text-13 md:block">{rating}</span>
      <span className="hidden text-right font-mono text-12 text-text-muted md:block">
        {item.updated_at.slice(0, 10)}
      </span>
    </Link>
  );
}
