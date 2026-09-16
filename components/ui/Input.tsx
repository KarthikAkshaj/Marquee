import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Focus is an amber edge plus a soft amber halo, as in the handoff's login card. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-card border border-white/10 bg-surface px-3.5 py-3 text-14 text-text",
        "transition-[border-color,box-shadow] duration-150 ease-cinematic placeholder:text-text-muted",
        "focus-visible:border-accent/40 focus-visible:shadow-input-focus focus-visible:outline-none",
        "aria-invalid:border-dropped/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
