"use client";

import { categoryStyle } from "@/lib/categories";
import { MOODS } from "@/lib/moods";
import type { PaletteCategory } from "@/lib/palette";
import { LENGTHS, type SurpriseFilter } from "@/lib/surprise";
import { cn } from "@/lib/utils";

type SurpriseChoicesProps = {
  /** Shelves with anything planned. */
  shelves: PaletteCategory[];
  filter: SurpriseFilter;
  /** Whether a change would leave anything to spin through. */
  leaves: (patch: Partial<SurpriseFilter>) => boolean;
  onChange: (patch: Partial<SurpriseFilter>) => void;
};

type Choice = { key: string; label: string; on: boolean; open: boolean; hint?: string; dot?: string; pick: () => void };

/**
 * Surprise me's three questions (SPEC §10): which shelf, how long you've got,
 * and the mood. A choice that would leave nothing to spin is greyed out.
 */
export function SurpriseChoices({ shelves, filter, leaves, onChange }: SurpriseChoicesProps) {
  const hint = LENGTHS.find((length) => length.slug === filter.length)?.hint;
  const row = <K extends keyof SurpriseFilter>(key: K, value: SurpriseFilter[K]) => ({
    on: filter[key] === value,
    // "Any" is always open; so is whatever is chosen now.
    open: value === null || filter[key] === value || leaves({ [key]: value } as Partial<SurpriseFilter>),
    pick: () => onChange({ [key]: value } as Partial<SurpriseFilter>),
  });

  return (
    <div className="flex flex-col gap-2.5">
      <ChoiceRow
        label="Pick from"
        choices={[
          { key: "any", label: "Anything", ...row("shelf", null) },
          ...shelves.map((shelf) => ({ key: shelf.id, label: shelf.name, dot: categoryStyle(shelf.color).dot, ...row("shelf", shelf.id) })),
        ]}
      />
      <ChoiceRow
        label="How long have you got?"
        choices={[
          { key: "any", label: "Any length", ...row("length", null) },
          ...LENGTHS.map((length) => ({ key: length.slug, label: length.label, hint: length.hint, ...row("length", length.slug) })),
        ]}
      />
      {/* Chip titles don't show on a phone, so the chosen length says what it means. */}
      {hint && <p className="-mt-0.5 text-12 text-text-muted">{hint}.</p>}
      <ChoiceRow
        label="What's the mood?"
        choices={[
          { key: "any", label: "Any mood", ...row("mood", null) },
          ...MOODS.map((mood) => ({ key: mood.slug, label: mood.label, ...row("mood", mood.slug) })),
        ]}
      />
    </div>
  );
}

/** One question: a row of chips that wraps on a wide screen and scrolls sideways on a phone. */
function ChoiceRow({ label, choices }: { label: string; choices: Choice[] }) {
  return (
    <div role="group" aria-label={label} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
        {choices.map((choice) => (
          <button
            key={choice.key}
            type="button"
            aria-pressed={choice.on}
            disabled={!choice.open}
            title={choice.hint}
            onClick={choice.pick}
            className={cn(
              "press flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[12.5px] disabled:cursor-not-allowed disabled:opacity-35 md:h-8.5",
              choice.on ? "border-accent/45 bg-accent/10 font-semibold text-text" : "border-white/8 bg-elevated text-text-muted enabled:hover:text-text",
            )}
          >
            {choice.dot && <span aria-hidden className={cn("size-1.5 rounded-full", choice.dot)} />}
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
