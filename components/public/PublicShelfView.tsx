"use client";

import { StatusTabs } from "@/components/category/StatusTabs";
import { DEFAULT_CATEGORY_PARAMS, countByStatus } from "@/lib/items";
import type { PublicShelf, PublicTitle } from "@/lib/public-profile";
import { statusLabel } from "@/lib/status";
import { PublicEmpty } from "./PublicEmpty";
import { PublicGrid } from "./PublicGrid";
import { PublicTitleDialog } from "./PublicTitleDialog";
import { ShelfTabs } from "./ShelfTabs";
import { usePublicShelf } from "./usePublicShelf";

type PublicShelfViewProps = {
  username: string;
  shelves: PublicShelf[];
  shelf: PublicShelf;
  titles: PublicTitle[];
  /** "Flux", for the foot of a title's card. */
  ownerName: string;
  own: boolean;
};

/**
 * The shared shelves: chips to switch shelf (from the server), then status
 * tabs, posters and each title's card (all in the browser, SPEC §19).
 */
export function PublicShelfView({ username, shelves, shelf, titles, ownerName, own }: PublicShelfViewProps) {
  const firstShelf = shelves[0]?.slug ?? shelf.slug;
  const { status, itemId, href, pickStatus, open, close } = usePublicShelf(username, firstShelf, shelf.slug);
  const shown = status === "all" ? titles : titles.filter((title) => title.status === status);
  const opened = itemId ? titles.find((title) => title.id === itemId) : undefined;

  return (
    <section aria-label={`${shelf.name} shelf`} className="mt-10 flex flex-col gap-5 md:mt-14 md:gap-6">
      <ShelfTabs username={username} shelves={shelves} active={shelf.slug} />
      {titles.length > 0 && (
        <StatusTabs
          slug={`public-${shelf.slug}`}
          kind={shelf.kind}
          params={{ ...DEFAULT_CATEGORY_PARAMS, status }}
          counts={countByStatus(titles)}
          hrefFor={(tab) => href({ status: tab })}
          onPick={pickStatus}
        />
      )}
      {shown.length > 0 ? (
        <PublicGrid titles={shown} shelf={shelf} hrefFor={(id) => href({ item: id })} onOpen={open} />
      ) : titles.length > 0 && status !== "all" ? (
        <PublicEmpty line="Nothing here." sentence={`No titles marked ${statusLabel(shelf.kind, status)} on this shelf.`} />
      ) : (
        <PublicEmpty line="An empty shelf." sentence={own ? "Add a title and it shows up here." : "Nothing on it yet. Check back soon."} />
      )}

      {opened && (
        <PublicTitleDialog
          key={opened.id}
          title={opened}
          onClose={close}
          kind={shelf.kind}
          categoryColor={shelf.color}
          shelfLine={`${ownerName}'s ${shelf.name} shelf`}
        />
      )}
    </section>
  );
}
