"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GlideGroup, useGlide } from "@/components/ui/Glide";
import { categoryStyle } from "@/lib/categories";
import type { StatsShelf } from "@/lib/stats";
import { cn, isPlainClick } from "@/lib/utils";

/**
 * One row of shelf chips above everything they scope (the URL keeps the
 * choice, SPEC §8): Stats, and For you. Only shelves with something on them
 * are offered. The chosen chip's amber glides to the next one you pick (U20).
 */
export function ShelfFilter({
  shelves,
  shelf,
  onPick,
  path = "/stats",
  label = "Count one shelf",
}: {
  shelves: readonly StatsShelf[];
  shelf: StatsShelf | null;
  /** Switch in the browser instead of navigating (StatsBrowser); a plain link otherwise. */
  onPick?: (href: string) => void;
  /** The page the chips scope. */
  path?: "/stats" | "/for-you";
  label?: string;
}) {
  if (shelves.length < 2) return null;

  return (
    <nav aria-label={label} className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
      <GlideGroup id={`${path.slice(1)}-shelves`}>
        <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
          <li>
            <Chip href={path} current={shelf === null} onPick={onPick}>
              Everything
            </Chip>
          </li>
          {shelves.map((entry) => (
            <li key={entry.id}>
              <Chip href={`${path}?shelf=${encodeURIComponent(entry.slug)}`} current={shelf?.id === entry.id} onPick={onPick}>
                <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(entry.color).dot)} />
                {entry.name}
              </Chip>
            </li>
          ))}
        </ul>
      </GlideGroup>
    </nav>
  );
}

function Chip({ href, current, onPick, children }: { href: string; current: boolean; onPick?: (href: string) => void; children: ReactNode }) {
  // The pill covers the chip's own border, so the chosen chip wears only the amber one.
  const { bind, frames } = useGlide(href, current, "-inset-px border border-accent/45 bg-accent/10");

  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "true" : undefined}
      onClick={
        onPick &&
        ((event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          onPick(href);
        })
      }
      className={cn(
        "press relative isolate flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[12.5px] md:h-8.5",
        current ? "border-transparent font-semibold text-text" : "border-white/8 bg-elevated text-text-muted hover:text-text",
      )}
      {...bind}
    >
      {frames}
      {children}
    </Link>
  );
}
