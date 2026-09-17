"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  /** Spoken name; shown only for the `text` variant. */
  label: string;
  /** What the swatch shows, e.g. a colour dot or an icon. */
  content?: ReactNode;
};

type SwatchPickerProps<T extends string> = {
  label: string;
  hint?: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `swatch` is a grid of 44px squares; `text` is a segmented row of words. */
  variant?: "swatch" | "text";
};

/** A labelled radio group with one tab stop; arrow keys move the choice. */
export function SwatchPicker<T extends string>({ label, hint, options, value, onChange, variant = "swatch" }: SwatchPickerProps<T>) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p id={labelId} className="label-mono tracking-[.12em] text-text-muted">
          {label}
        </p>
        {hint && <p className="truncate text-[11.5px] text-text-muted">{hint}</p>}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={cn(
          variant === "text"
            ? "flex gap-1 rounded-[9px] border border-border bg-surface p-1"
            : "grid grid-cols-6 gap-1.5 sm:grid-cols-9",
        )}
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={variant === "text" ? undefined : option.label}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "flex min-h-11 items-center justify-center transition-colors",
                variant === "text"
                  ? cn(
                      "flex-1 rounded-pill px-1 text-[11.5px] md:min-h-9 md:text-12",
                      selected ? "bg-accent font-semibold text-accent-ink" : "text-text-muted hover:text-text",
                    )
                  : cn(
                      "aspect-square rounded-card border text-text-muted sm:min-h-0",
                      selected
                        ? "border-accent/60 bg-accent/10 text-text shadow-input-focus"
                        : "border-white/8 bg-surface hover:border-white/20 hover:text-text",
                    ),
              )}
            >
              {variant === "text" ? option.label : option.content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
