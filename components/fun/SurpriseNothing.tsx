"use client";

import { Button } from "@/components/ui/Button";
import { nothingLine, type SurpriseFilter, type SurpriseSource } from "@/lib/surprise";

type SurpriseNothingProps = {
  filter: SurpriseFilter;
  source: SurpriseSource;
  /** The chosen shelf's name, when one is chosen. */
  shelfName: string | null;
  /** Whether a change would leave anything to spin through on your list. */
  leaves: (patch: Partial<SurpriseFilter>) => boolean;
  /** Providers that didn't answer, for "Something new". */
  notices: string[];
  onChange: (patch: Partial<SurpriseFilter>, source?: SurpriseSource) => void;
};

type Way = { label: string; patch: Partial<SurpriseFilter>; source?: SurpriseSource };

/**
 * When the choices leave nothing to spin (SPEC §10): which choice it is, in
 * words ("Nothing on your list can be finished in an hour."), then one tap to
 * loosen it, or to look beyond your list for something that fits. On your
 * list only ways that leave something are offered; for new titles that can't
 * be known before asking, so every loosening is.
 */
export function SurpriseNothing({ filter, source, shelfName, leaves, notices, onChange }: SurpriseNothingProps) {
  const own = source === "list";
  const ways: Way[] = [
    // Nothing of yours fits: the same choices, from titles you don't have.
    ...(own ? [{ label: "Find something new that fits", patch: {}, source: "new" as const }] : []),
    // Too little time for anything whole: start one episode of something longer instead.
    ...(own && filter.length && filter.length !== "episode" ? [{ label: "Just an episode instead", patch: { length: "episode" as const } }] : []),
    ...(filter.length ? [{ label: "Any length", patch: { length: null } }] : []),
    ...(filter.mood ? [{ label: "Any mood", patch: { mood: null } }] : []),
    ...(filter.shelf ? [{ label: "Every shelf", patch: { shelf: null } }] : []),
  ].filter((way) => way.source === "new" || !own || leaves(way.patch));

  return (
    <div aria-live="polite" className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="max-w-110 font-display text-[28px] leading-[1.12] text-balance">{nothingLine(filter, shelfName, source)}</p>
      {notices.map((notice) => (
        <p key={notice} className="text-13 text-text-muted">
          {notice}
        </p>
      ))}
      <p className="text-13 text-text-muted">{ways.length > 0 ? "Try one of these:" : "Nothing fits these together."}</p>
      <div className="mt-1 flex max-w-110 flex-wrap justify-center gap-2.5">
        {ways.length > 0 ? (
          ways.map((way, index) => (
            <Button key={way.label} variant={index === 0 ? "primary" : "secondary"} onClick={() => onChange(way.patch, way.source)} className="h-11 px-4.5 text-13">
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
