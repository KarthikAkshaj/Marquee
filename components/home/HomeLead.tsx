"use client";

import { Fragment, useState, type ReactNode } from "react";
import { RoomLight } from "@/components/shell/RoomLight";
import type { Item } from "@/lib/items";
import type { PaletteCategory } from "@/lib/palette";
import { generatedCover } from "@/lib/poster-art";
import { ContinueRow } from "./ContinueRow";
import { Spotlight } from "./Spotlight";

type HomeLeadProps = {
  /** In progress everywhere, most recently touched first. */
  items: Item[];
  shelves: PaletteCategory[];
  greeting: ReactNode;
  /** Between the spotlight and the Continue row: the year in review, in season. */
  children?: ReactNode;
};

/**
 * The top of Home: the spotlight on the title you last touched, then Continue
 * for the rest (U10). The spotlight holds its title while you use it, so a +1
 * elsewhere that reorders the list doesn't swap the picture under your hand;
 * it moves on only once its title is finished and stamped.
 */
export function HomeLead({ items, shelves, greeting, children }: HomeLeadProps) {
  const byId = new Map(shelves.map((shelf) => [shelf.id, shelf]));
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const ready = (item: Item) => !done.has(item.id) && byId.has(item.category_id);
  const next = items.find((item) => item.status === "in_progress" && ready(item)) ?? null;

  const [pinned, setPinned] = useState<string | null>(next?.id ?? null);
  const lead = items.find((item) => item.id === pinned && ready(item)) ?? next;
  if ((lead?.id ?? null) !== pinned) setPinned(lead?.id ?? null);

  const rest = items.filter((item) => item.id !== lead?.id);
  const leadShelf = lead ? byId.get(lead.category_id) : undefined;
  // The room takes the spotlight title's colour (U14).
  const tint = lead && leadShelf ? (lead.accent_color ?? generatedCover(lead.id, leadShelf.color).tint) : null;
  const showRow = !lead || rest.some((item) => item.status === "in_progress");

  return (
    <>
      <RoomLight base={tint} />
      {lead ? (
        <Spotlight
          item={lead}
          shelf={byId.get(lead.category_id)!}
          greeting={greeting}
          onFinished={() => setDone((finished) => new Set(finished).add(lead.id))}
        />
      ) : (
        // Slots made on the server sit among this list's children; keyed wrappers keep React's
        // list-key check from mistaking them for unkeyed list items.
        <Fragment key="greeting">{greeting}</Fragment>
      )}
      <Fragment key="between">{children}</Fragment>
      {showRow && (
        <div className="mt-5.5 md:mt-8.5">
          <ContinueRow items={rest} shelves={shelves} />
        </div>
      )}
    </>
  );
}
