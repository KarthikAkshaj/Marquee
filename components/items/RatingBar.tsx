"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type RatingBarProps = {
  value: number | null;
  onChange: (rating: number | null) => void;
  /** The provider's score out of 100, e.g. { source: "AniList", score: 91 } (SPEC §7). */
  community?: { source: string; score: number } | null;
};

// Bars rise 12px → 30px, as in the handoff.
const HEIGHTS = ["h-3", "h-3.5", "h-4", "h-4.5", "h-5", "h-5.5", "h-6", "h-6.5", "h-7", "h-7.5"];

/**
 * Ten slim bars that fill amber, whole numbers only (SPEC §8.3, §9.5).
 * Hover previews, click sets, clicking the current rating clears it.
 * One tab stop: a slider driven by the arrow keys.
 */
export function RatingBar({ value, onChange, community }: RatingBarProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const labelId = useId();
  const lit = preview ?? value ?? 0;

  function onKeyDown(event: KeyboardEvent) {
    const now = value ?? 0;
    const next: Record<string, number | null> = {
      ArrowRight: Math.min(10, now + 1),
      ArrowUp: Math.min(10, now + 1),
      ArrowLeft: now <= 1 ? null : now - 1,
      ArrowDown: now <= 1 ? null : now - 1,
      Home: 1,
      End: 10,
      Backspace: null,
      Delete: null,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    if (next[event.key] !== value) onChange(next[event.key]);
  }

  return (
    <div className="flex-1 rounded-card border border-border bg-surface px-4 py-3.5 surface-highlight">
      <div className="flex items-baseline justify-between">
        <p id={labelId} className="label-mono tracking-[.12em] text-text-muted">
          Rating
        </p>
        <p className="flex items-baseline gap-2.5 font-mono text-13">
          {community && (
            <span className="text-12 text-text-muted">
              {community.source} {community.score}
            </span>
          )}
          <span className={value ? "text-accent" : "text-text-muted"}>{value ? `${value} / 10` : "Not rated"}</span>
        </p>
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value ?? 0}
        aria-valuetext={value ? `${value} out of 10` : "Not rated"}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setPreview(null)}
        className="mt-2 flex h-11 cursor-pointer items-end gap-1.25 rounded-[4px] md:mt-3 md:h-8 md:gap-1"
      >
        {HEIGHTS.map((height, index) => {
          const rating = index + 1;
          return (
            <span
              key={rating}
              onPointerEnter={(event) => event.pointerType === "mouse" && setPreview(rating)}
              onClick={() => onChange(rating === value ? null : rating)}
              className="flex h-full flex-1 items-end"
            >
              <span
                className={cn(
                  "w-full rounded-xs transition-[background-color,box-shadow] duration-150",
                  height,
                  rating <= lit ? "bg-accent shadow-[0_0_8px_color-mix(in_oklab,var(--color-accent)_50%,transparent)]" : "bg-white/10",
                  preview !== null && rating <= lit && rating > (value ?? 0) && "bg-accent/55 shadow-none",
                )}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
