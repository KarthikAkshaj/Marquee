"use client";

import { useRef, type KeyboardEvent } from "react";
import { ITEM_STATUSES, STATUS_STYLE, statusLabels, type CategoryKind, type ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

type StatusSegmentedProps = {
  kind: CategoryKind;
  value: ItemStatus;
  onChange: (status: ItemStatus) => void;
  /** id of the visible label. */
  labelledBy: string;
};

/**
 * The one status control (SPEC §8.6): four segments in the shelf's own words.
 * A radio group, so arrow keys move between statuses and Tab leaves it.
 */
export function StatusSegmented({ kind, value, onChange, labelledBy }: StatusSegmentedProps) {
  const labels = statusLabels(kind);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + ITEM_STATUSES.length) % ITEM_STATUSES.length;
    onChange(ITEM_STATUSES[next]);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="flex gap-1 rounded-[9px] border border-border bg-surface p-1 surface-highlight"
    >
      {ITEM_STATUSES.map((status, index) => {
        const selected = status === value;
        return (
          <button
            key={status}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(status)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "min-h-11 flex-1 rounded-pill px-1 text-[11.5px] leading-tight transition-colors duration-200 ease-cinematic md:min-h-9 md:text-12",
              selected
                ? cn(STATUS_STYLE[status].fill, "font-semibold text-accent-ink")
                : "text-text-muted hover:text-text",
            )}
          >
            {labels[status]}
          </button>
        );
      })}
    </div>
  );
}
