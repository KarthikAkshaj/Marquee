"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<ComponentProps<"button">, "onChange" | "role"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/**
 * An on/off switch whose knob is a marquee bulb: dark when off, lit amber
 * when on. Wrap it in a <label> (or give it aria-labelledby) so the whole
 * row answers a tap.
 */
export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10.5 shrink-0 items-center rounded-full border transition-[background-color,border-color] duration-200 ease-cinematic",
        "disabled:cursor-wait disabled:opacity-60",
        checked ? "border-accent/55 bg-accent/22" : "border-white/12 bg-inset",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.75 size-4 rounded-full transition-[translate,background-color,box-shadow] duration-300 ease-spring lite:duration-0",
          checked ? "translate-x-4.5 bg-accent shadow-bulb-low" : "bg-text-muted",
        )}
      />
    </button>
  );
}
