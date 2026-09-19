import { cn } from "@/lib/utils";

const STEPS = ["Category", "Source", "Review"];

/** "01 Category — 02 Source — 03 Review": where you are in the import (handoff §05). */
export function StepDots({ active }: { active: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Import steps" className="flex items-center gap-3.5">
      {STEPS.map((name, index) => {
        const on = index === active;
        const done = index < active;
        return (
          <li key={name} aria-current={on ? "step" : undefined} className="flex items-center gap-2.25">
            <span
              className={cn(
                "grid size-5.5 place-items-center rounded-full border font-mono text-[10.5px]",
                on && "border-accent bg-accent text-accent-ink",
                done && "border-accent/40 bg-accent/16 text-accent",
                !on && !done && "border-white/14 text-text-muted",
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={cn("text-[12.5px]", on ? "font-semibold text-text" : "text-text-muted")}>{name}</span>
            {index < STEPS.length - 1 && <span aria-hidden className="h-px w-6.5 bg-white/12" />}
          </li>
        );
      })}
    </ol>
  );
}
