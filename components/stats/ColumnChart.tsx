"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { categoryStyle } from "@/lib/categories";
import { STAGGER_MS } from "@/lib/motion";
import { niceCeiling } from "@/lib/stats";
import { cn } from "@/lib/utils";

export type ChartColumn = {
  key: string;
  /** Under the column: "Mar", "8". */
  label: string;
  /** The label on a phone, where twelve "Mar"s don't fit: "M". */
  shortLabel?: string;
  /** A second line under the label: the year under January. */
  sublabel?: string;
  /** This month: its label stands out. */
  current?: boolean;
  value: number;
  /** What the column is, in full: "March 2026". */
  name: string;
  /** Its value in words, which leads the tooltip: "14 finished". */
  summary: string;
  /** A breakdown under the value, each part keyed by its shelf's colour. */
  parts?: { label: string; value: number; color: string }[];
};

type ColumnChartProps = {
  /** The chart's accessible name. */
  label: string;
  columns: ChartColumn[];
  /** Writes the tallest column's value on its cap. */
  labelPeak?: boolean;
  /** A line across the plot at a fractional column (0 is the first column's centre): the average score. */
  marker?: { at: number; label: string };
  /** The column Tab lands on first. The last one by default. */
  initial?: number;
};

// Spelled out so Tailwind sees them; any other count falls back to an inline template.
const GRID: Record<number, string> = { 10: "grid-cols-10", 12: "grid-cols-12" };

/**
 * Thin amber columns on one baseline (SPEC §10, stats). Hovering, tapping or
 * focusing a column shows its tooltip; the arrow keys walk the columns, so
 * the whole chart is one Tab stop. Every value is also in the table under it.
 */
export function ColumnChart({ label, columns, labelPeak = false, marker, initial }: ColumnChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [tabbable, setTabbable] = useState(initial ?? columns.length - 1);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  const max = Math.max(...columns.map((column) => column.value));
  const top = niceCeiling(max);
  const peak = labelPeak && max > 0 ? columns.findLastIndex((column) => column.value === max) : -1;
  const active = hovered ?? focused;
  const grid = GRID[columns.length];
  const template = grid ? undefined : { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` };

  const move = (event: KeyboardEvent, index: number) => {
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: columns.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    refs.current[Math.min(Math.max(next, 0), columns.length - 1)]?.focus();
  };

  return (
    <div className="flex pt-6">
      <div aria-hidden className="relative h-36 w-8 shrink-0 font-mono text-[10px] text-text-muted md:h-44">
        <span className="absolute top-0 -translate-y-1/2">{top}</span>
        <span className="absolute top-1/2 -translate-y-1/2">{top / 2}</span>
        <span className="absolute bottom-0 translate-y-1/2">0</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative h-36 md:h-44">
          <span aria-hidden className="absolute inset-x-0 top-0 border-t border-white/6" />
          <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-white/6" />
          <span aria-hidden className="absolute inset-x-0 bottom-0 border-t border-white/14" />

          {marker && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 z-1 w-px bg-text-muted/60"
              style={{ left: `${((marker.at + 0.5) / columns.length) * 100}%` }}
            >
              <span className="absolute -top-5.5 left-1/2 -translate-x-1/2 font-mono text-[10.5px] whitespace-nowrap text-text-muted">
                {marker.label}
              </span>
            </span>
          )}

          <div
            role="group"
            aria-label={label}
            className={cn("absolute inset-0 grid", grid)}
            style={template}
            onPointerLeave={() => setHovered(null)}
          >
            {columns.map((column, index) => {
              const height = (column.value / top) * 100;
              const on = active === index;
              return (
                <div
                  key={column.key}
                  ref={(node) => {
                    refs.current[index] = node;
                  }}
                  role="img"
                  aria-label={`${column.name}: ${column.summary}`}
                  tabIndex={index === tabbable ? 0 : -1}
                  onPointerEnter={() => setHovered(index)}
                  onFocus={() => {
                    setFocused(index);
                    setTabbable(index);
                  }}
                  onBlur={() => setFocused(null)}
                  onKeyDown={(event) => move(event, index)}
                  className="relative h-full cursor-default"
                >
                  {column.value > 0 && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 bottom-0 mx-auto w-[min(24px,calc(100%-6px))] origin-bottom animate-grow rounded-t-[4px] transition-colors",
                        on ? "bg-accent-hover" : "bg-accent",
                      )}
                      style={{ height: `${height}%`, animationDelay: `${index * STAGGER_MS}ms` }}
                    />
                  )}
                  {index === peak && !on && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 text-center font-mono text-[11px] text-text"
                      style={{ bottom: `calc(${height}% + 4px)` }}
                    >
                      {column.value}
                    </span>
                  )}
                  {on && <Tooltip column={column} height={height} align={index < 2 ? "start" : index > columns.length - 3 ? "end" : "center"} />}
                </div>
              );
            })}
          </div>
        </div>

        <div aria-hidden className={cn("mt-2 grid", grid)} style={template}>
          {columns.map((column) => (
            <span
              key={column.key}
              className={cn(
                "text-center font-mono text-[10px] leading-tight md:text-[11px]",
                column.current ? "font-semibold text-text" : "text-text-muted",
              )}
            >
              {column.shortLabel ? (
                <>
                  <span className="md:hidden">{column.shortLabel}</span>
                  <span className="max-md:hidden">{column.label}</span>
                </>
              ) : (
                column.label
              )}
              {column.sublabel && <span className="block text-[9.5px] font-normal text-text-muted md:text-[10px]">{column.sublabel}</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The value first and loudest, then what it is, then the breakdown. */
function Tooltip({ column, height, align }: { column: ChartColumn; height: number; align: "start" | "center" | "end" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-10 w-max max-w-52 rounded-card border border-white/10 bg-menu px-3 py-2 text-left shadow-tip",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
      )}
      style={{ bottom: `calc(${height}% + 10px)` }}
    >
      <span className="block text-13 font-semibold text-text">{column.summary}</span>
      <span className="block text-12 text-text-muted">{column.name}</span>
      {column.parts && column.parts.length > 0 && (
        <span className="mt-1.5 flex flex-col gap-0.5 border-t border-white/8 pt-1.5">
          {column.parts.map((part) => (
            <span key={part.label} className="flex items-center gap-2 text-12 text-text-muted">
              <span aria-hidden className={cn("h-0.5 w-2.5 shrink-0 rounded-full", categoryStyle(part.color).dot)} />
              <span className="min-w-0 flex-1 truncate">{part.label}</span>
              <span className="font-mono text-text">{part.value}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
