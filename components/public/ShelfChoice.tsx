"use client";

import type { ViewerShelf } from "@/lib/public-profile";
import { cn } from "@/lib/utils";

type ShelfChoiceProps = {
  shelves: ViewerShelf[];
  value: string;
  onChange: (id: string) => void;
  /** Keeps two choices on one page apart. */
  name: string;
};

/** Which of your shelves a shared title goes on, as chips. Only shown when there's more than one to pick from. */
export function ShelfChoice({ shelves, value, onChange, name }: ShelfChoiceProps) {
  return (
    <div role="radiogroup" aria-label="Which shelf" className="flex flex-wrap gap-1.5">
      {shelves.map((shelf) => (
        <label
          key={shelf.id}
          className={cn(
            "press flex h-11 cursor-pointer items-center rounded-full border px-3.5 text-[12.5px] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent md:h-8",
            shelf.id === value ? "border-accent/45 bg-accent/10 font-semibold text-text" : "border-white/8 bg-elevated text-text-muted hover:text-text",
          )}
        >
          <input
            type="radio"
            name={name}
            value={shelf.id}
            checked={shelf.id === value}
            onChange={() => onChange(shelf.id)}
            className="sr-only"
          />
          {shelf.name}
        </label>
      ))}
    </div>
  );
}
