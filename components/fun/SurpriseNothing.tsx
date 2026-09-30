"use client";

import { Button } from "@/components/ui/Button";
import { nothingLine, type SurpriseFilter } from "@/lib/surprise";

type SurpriseNothingProps = {
  filter: SurpriseFilter;
  /** The chosen shelf's name, when one is chosen. */
  shelfName: string | null;
  /** Whether a change would leave anything to spin through. */
  leaves: (patch: Partial<SurpriseFilter>) => boolean;
  onChange: (patch: Partial<SurpriseFilter>) => void;
};

type Way = { label: string; patch: Partial<SurpriseFilter> };

/**
 * When the choices leave nothing to spin (SPEC §10): which choice it is, in
 * words ("Nothing on your list can be finished in an hour."), then one tap to
 * loosen it. Only ways that leave something are offered.
 */
export function SurpriseNothing({ filter, shelfName, leaves, onChange }: SurpriseNothingProps) {
  const ways: Way[] = [
    // Too little time for anything whole: start one episode of something longer instead.
    ...(filter.length && filter.length !== "episode" ? [{ label: "Just an episode instead", patch: { length: "episode" as const } }] : []),
    ...(filter.length ? [{ label: "Any length", patch: { length: null } }] : []),
    ...(filter.mood ? [{ label: "Any mood", patch: { mood: null } }] : []),
    ...(filter.shelf ? [{ label: "Every shelf", patch: { shelf: null } }] : []),
  ].filter((way) => leaves(way.patch));

  return (
    <div aria-live="polite" className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="max-w-110 font-display text-[28px] leading-[1.12] text-balance">{nothingLine(filter, shelfName)}</p>
      <p className="text-13 text-text-muted">{ways.length > 0 ? "Loosen one of your choices:" : "Nothing fits these together."}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2.5">
        {ways.length > 0 ? (
          ways.map((way, index) => (
            <Button key={way.label} variant={index === 0 ? "primary" : "secondary"} onClick={() => onChange(way.patch)} className="h-11 px-4.5 text-13">
              {way.label}
            </Button>
          ))
        ) : (
          <Button variant="secondary" onClick={() => onChange({ shelf: null, length: null, mood: null })} className="h-11 px-4.5 text-13">
            Clear the choices
          </Button>
        )}
      </div>
    </div>
  );
}
