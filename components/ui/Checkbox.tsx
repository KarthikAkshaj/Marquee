"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Read by screen readers; the box itself is the visible cue. */
  label: string;
  className?: string;
};

/** An amber tick box (handoff §05). A real checkbox underneath, with a 44px hit area on phones. */
export function Checkbox({ checked, onChange, label, className }: CheckboxProps) {
  return (
    <label className={cn("relative grid size-11 shrink-0 cursor-pointer place-items-center md:size-7", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="peer size-4.5 appearance-none rounded-[5px] border border-white/20 transition-colors [grid-area:1/1] checked:border-accent checked:bg-accent"
      />
      <Check
        aria-hidden
        className="pointer-events-none size-3 text-accent-ink opacity-0 transition-opacity [grid-area:1/1] peer-checked:opacity-100"
        strokeWidth={3}
      />
    </label>
  );
}
