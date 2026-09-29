"use client";

import { Check, Plus, X } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ItemCover } from "@/components/items/ItemCover";
import { Button } from "@/components/ui/Button";
import { resultMeta } from "@/lib/add";
import { titleHref } from "@/lib/palette";
import { generatedCover } from "@/lib/poster-art";
import type { PickShelf } from "@/lib/recommend";
import type { SearchResult } from "@/lib/search/types";

/** A new title as the page shows it: what the provider said, where it would go, and why. */
export type NewPickView = { key: string; result: SearchResult; categoryId: string; reason: string };

export type PlanState = { status: "idle" } | { status: "adding" } | { status: "planned"; id: string };

type NewPickCardProps = {
  pick: NewPickView;
  shelf: PickShelf;
  state: PlanState;
  onPlan: () => void;
  onDismiss: () => void;
  eager?: boolean;
};

/**
 * One title from outside your shelves (SPEC §20): its poster, why it's here,
 * "Plan it" to put it on the shelf as Planned, and ✕ for "not for me". Once
 * planned, the button opens it on its shelf instead.
 */
export function NewPickCard({ pick, shelf, state, onPlan, onDismiss, eager = false }: NewPickCardProps) {
  const { result } = pick;
  const glow = result.accentColor
    ? `color-mix(in oklab, ${result.accentColor} 34%, transparent)`
    : generatedCover(pick.key, shelf.color).glow;

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div
        className="relative aspect-2/3 overflow-hidden rounded-[10px] border border-white/7 shadow-[0_10px_26px_var(--glow)]"
        style={{ "--glow": glow } as CSSProperties}
      >
        <ItemCover
          item={{ id: pick.key, cover_url: result.coverUrl ?? null }}
          categoryColor={shelf.color}
          sizes="(min-width: 1024px) 170px, (min-width: 640px) 30vw, 45vw"
          eager={eager}
        />
        {state.status !== "planned" && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Not for me: ${result.title}`}
            title="Not for me"
            className="press absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-bg/65 text-text-muted backdrop-blur-[6px] transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:text-text"
          >
            <X aria-hidden className="size-3.75" strokeWidth={1.8} />
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 text-[12.5px] leading-[1.3] text-pretty text-text md:text-13">{result.title}</h3>
        <p className="truncate font-mono text-[10.5px] text-text-muted">{resultMeta(result)}</p>
        <p className="line-clamp-2 text-[11.5px] leading-[1.35] text-text-muted">{pick.reason}</p>
      </div>

      {state.status === "planned" ? (
        <Button asChild variant="secondary" size="sm" className="h-11 w-full border-accent/40 text-accent md:h-8.5">
          <Link href={titleHref(shelf, state.id)}>
            <Check aria-hidden className="size-3.75" strokeWidth={2} />
            On {shelf.name}
          </Link>
        </Button>
      ) : (
        <Button variant="secondary" size="sm" className="h-11 w-full md:h-8.5" disabled={state.status === "adding"} onClick={onPlan}>
          <Plus aria-hidden className="size-3.75" strokeWidth={2} />
          {state.status === "adding" ? "Adding…" : "Plan it"}
          <span className="sr-only">: {result.title}</span>
        </Button>
      )}
    </div>
  );
}
