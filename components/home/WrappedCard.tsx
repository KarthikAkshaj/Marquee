import { ChevronRight, Ticket } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The way in to /wrapped, on Home through December and January only. The page
 * itself stays reachable all year; this is what makes it an occasion.
 */
export function WrappedCard({ year, className }: { year: number; className?: string }) {
  return (
    <Link
      href="/wrapped"
      className={cn(
        "group flex min-h-16 items-center gap-3.5 rounded-card border border-white/8 bg-elevated px-4 py-3.5 transition-colors hover:border-accent/35 md:gap-4.5 md:px-5.5 md:py-4.5",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent/30 bg-accent/12 text-accent"
      >
        <Ticket size={18} strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium md:text-[15.5px]">
          Your <span className="font-mono tabular-nums text-accent">{year}</span> is ready
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-text-muted md:text-13">
          Everything you watched, counted up. Takes a minute.
        </span>
      </span>
      <ChevronRight
        aria-hidden
        size={18}
        strokeWidth={1.5}
        className="shrink-0 text-text-faint transition-colors group-hover:text-accent"
      />
    </Link>
  );
}
