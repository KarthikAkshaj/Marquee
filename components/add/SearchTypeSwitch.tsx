"use client";

import { useRef, type KeyboardEvent } from "react";
import { SEARCH_TYPES, type SearchType } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const LABELS: Record<SearchType, string> = { anime: "Anime", manga: "Manga" };

type SearchTypeSwitchProps = {
  value: SearchType;
  onChange: (type: SearchType) => void;
};

/**
 * "Anime | Manga" on an anime shelf's search (U5): the anime, or AniList's
 * comics and novels. A radio group, so arrow keys flip it and Tab leaves it.
 */
export function SearchTypeSwitch({ value, onChange }: SearchTypeSwitchProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    // The search list around it moves on the same arrows.
    event.stopPropagation();
    const next = (index + step + SEARCH_TYPES.length) % SEARCH_TYPES.length;
    onChange(SEARCH_TYPES[next]);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Search for" className="flex h-7.5 items-center rounded-full border border-white/8 bg-elevated p-0.5">
      {SEARCH_TYPES.map((type, index) => {
        const selected = type === value;
        return (
          <button
            key={type}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(type)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              // A 44px touch target on phones, drawn outside the 30px pill.
              "relative h-full rounded-full px-2.75 text-[11.5px] whitespace-nowrap transition-colors duration-150 ease-cinematic before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] md:before:hidden",
              selected ? "bg-accent/15 font-medium text-accent" : "text-text-muted hover:text-text",
            )}
          >
            {LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
