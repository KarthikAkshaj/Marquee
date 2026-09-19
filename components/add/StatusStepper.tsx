"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_STYLE, statusLabel, type CategoryKind, type ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

type StatusStepperProps = {
  kind: CategoryKind;
  value: ItemStatus;
  onStep: (direction: 1 | -1) => void;
  /** Which title it's for, where several steppers share a list. */
  name?: string;
};

const arrow =
  "-my-1.75 grid size-11 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:text-text md:my-0 md:size-6.5";

/** "‹ Plan to Watch ›": the status a picked title goes in as. ←/→ step it from the keyboard. */
export function StatusStepper({ kind, value, onStep, name }: StatusStepperProps) {
  const suffix = name ? ` for ${name}` : "";
  return (
    <div className="flex h-7.5 items-center rounded-full border border-white/8 bg-elevated">
      <button type="button" aria-label={`Previous status${suffix}`} onClick={() => onStep(-1)} className={arrow}>
        <ChevronLeft aria-hidden className="size-3.5" strokeWidth={2} />
      </button>
      <span aria-live="polite" className="flex min-w-0 items-center gap-1.75 text-[11.5px] whitespace-nowrap text-text">
        <span className="sr-only">Adds as</span>
        <span aria-hidden className={cn("size-1.25 shrink-0 rounded-full", STATUS_STYLE[value].fill)} />
        {statusLabel(kind, value)}
      </span>
      <button type="button" aria-label={`Next status${suffix}`} onClick={() => onStep(1)} className={arrow}>
        <ChevronRight aria-hidden className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
