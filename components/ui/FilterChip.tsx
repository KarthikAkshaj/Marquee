"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useGlide } from "@/components/ui/Glide";
import { cn, isPlainClick } from "@/lib/utils";

type FilterChipProps = {
  href: string;
  current: boolean;
  /** Switch in the browser instead of navigating; a plain link otherwise. */
  onPick?: (href: string) => void;
  children: ReactNode;
};

/**
 * One chip in a row that scopes a page (Stats' shelves, For you's shelves and
 * moods). Inside a GlideGroup the chosen chip's amber glides to the next one
 * picked (U20). A link, so it still opens in a new tab.
 */
export function FilterChip({ href, current, onPick, children }: FilterChipProps) {
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
