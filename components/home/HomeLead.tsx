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
  /** This visit's spotlight: something started or planned, from any shelf. */
  featured: Item | null;
  shelves: PaletteCategory[];
  greeting: ReactNode;
  /** Between the spotlight and the Continue row: the year in review, in season. */
  children?: ReactNode;
};

/**
 * The top of Home: the spotlight on a title picked for this visit, then
 * Continue for everything in progress (U10). Every save refreshes the page and
 * the server picks again, but the spotlight holds its title while you use it,
 * so nothing swaps the picture under your hand; it moves on only once its
 * title is finished and stamped.
 */
export function HomeLead({ items, featured, shelves, greeting, children }: HomeLeadProps) {
  const byId = new Map(shelves.map((shelf) => [shelf.id, shelf]));
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const ready = (item: Item | null | undefined): item is Item => !!item && !done.has(item.id) && byId.has(item.category_id);

  const [held, setHeld] = useState<Item | null>(featured);
  // The held title as the server last sent it. A planned one only comes back when it's picked
  // again, and nothing here changes it without starting it, so the copy held is still true.
  // A started one that has left Continue was finished or moved: let it go.
  const current =
    held &&
    (items.find((item) => item.id === held.id) ??
      (held.id === featured?.id ? featured : null) ??
      (held.status === "planned" ? held : null));
  const lead = [current, featured, items.find((item) => item.status === "in_progress" && ready(item))].find(ready) ?? null;
  if (lead !== held) setHeld(lead);

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
