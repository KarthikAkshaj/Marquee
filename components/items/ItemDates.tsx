"use client";

import { useRef } from "react";
import type { Item } from "@/lib/items";
import { localToday, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

type ItemDatesProps = {
  item: Pick<Item, "started_at" | "finished_at" | "updated_at">;
  onChange: (dates: Partial<Pick<Item, "started_at" | "finished_at">>) => void;
};

/** STARTED · FINISHED · LAST TOUCHED. The first two are stamped automatically and can be corrected. */
export function ItemDates({ item, onChange }: ItemDatesProps) {
  const today = localToday();
  return (
    <div className="flex gap-3 md:gap-4">
      <DateField
        label="Started"
        value={item.started_at}
        max={item.finished_at ?? today}
        onChange={(started_at) => onChange({ started_at })}
      />
      <DateField
        label="Finished"
        value={item.finished_at}
        min={item.started_at ?? undefined}
        max={today}
        onChange={(finished_at) => onChange({ finished_at })}
      />
      <div className="min-w-0 flex-1">
        <p className="label-mono tracking-[.12em] text-text-muted">
          <span className="md:hidden">Touched</span>
          <span className="hidden md:inline">Last touched</span>
        </p>
        <p className="mt-1.5 flex min-h-11 items-center font-mono text-[12.5px] md:min-h-0 md:py-0.5 md:text-[13.5px]">
          {timeAgo(item.updated_at)}
        </p>
      </div>
    </div>
  );
}

type DateFieldProps = {
  label: string;
  value: string | null;
  min?: string;
  max?: string;
  onChange: (value: string | null) => void;
};

/** Shows the date in mono; opens the browser's own date picker (which can also clear it). */
function DateField({ label, value, min, max, onChange }: DateFieldProps) {
  const input = useRef<HTMLInputElement>(null);

  function openPicker() {
    const node = input.current;
    if (!node) return;
    try {
      node.showPicker();
    } catch {
      node.focus();
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <p className="label-mono tracking-[.12em] text-text-muted">{label}</p>
      <button
        type="button"
        onClick={openPicker}
        aria-label={`${label}: ${value ?? "not set"}. Change date`}
        className={cn(
          "-mx-1 mt-1.5 min-h-11 rounded-[6px] px-1 py-0.5 text-left font-mono text-[12.5px] transition-colors hover:bg-white/5 md:min-h-0 md:text-[13.5px]",
          !value && "text-text-faint",
        )}
      >
        {value ?? "—"}
      </button>
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value || null)}
        className="pointer-events-none absolute bottom-0 left-0 h-6 w-full opacity-0 [color-scheme:dark]"
      />
    </div>
  );
}
