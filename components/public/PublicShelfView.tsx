"use client";

import { useState } from "react";
import { StatusTabs } from "@/components/category/StatusTabs";
import { DEFAULT_CATEGORY_PARAMS, countByStatus } from "@/lib/items";
import { shelvesFor, type PublicShelf, type PublicTitle, type PublicViewer, type ShelfAccess, type ViewerCopy } from "@/lib/public-profile";
import { statusLabel } from "@/lib/status";
import { AddAllButton } from "./AddAllButton";
import { AddToMyShelf } from "./AddToMyShelf";
import { PublicEmpty } from "./PublicEmpty";
import { PublicGrid } from "./PublicGrid";
import { PublicTitleDialog } from "./PublicTitleDialog";
import { ShelfTabs } from "./ShelfTabs";
import { usePublicShelf } from "./usePublicShelf";

type PublicShelfViewProps = {
  /** A public profile (with chips for its other shared shelves) or one shelf's link. */
  access: ShelfAccess;
  /** Every shelf this way in shows: a profile's shared ones, or just the linked one. */
  shelves: PublicShelf[];
  shelf: PublicShelf;
  titles: PublicTitle[];
  /** "Flux", for the foot of a title's card. */
  ownerName: string;
  own: boolean;
  signedIn: boolean;
  /** A signed-in visitor's shelves and copies, for Add to my shelf and Add all. */
  viewer: PublicViewer | null;
};

/**
 * A shared shelf: chips to switch shelf on a profile (from the server), then
 * status tabs, Add all, posters and each title's card (all in the browser,
 * SPEC §19).
 */
export function PublicShelfView({ access, shelves, shelf, titles, ownerName, own, signedIn, viewer }: PublicShelfViewProps) {
  const firstShelf = shelves[0]?.slug ?? shelf.slug;
  const { status, itemId, href, pickStatus, open, close } = usePublicShelf(access, firstShelf, shelf.slug);
  const shown = status === "all" ? titles : titles.filter((title) => title.status === status);
  const opened = itemId ? titles.find((title) => title.id === itemId) : undefined;
  // Copies made on this visit, on top of the ones the page came with.
  const [added, setAdded] = useState<Record<string, ViewerCopy>>({});
  const copies = { ...viewer?.has, ...added };
  const yourShelves = viewer ? shelvesFor(viewer, shelf.kind) : [];
  // Signed in but without a viewer: the database hasn't learned Add to my shelf yet.
  const canAdd = !own && (signedIn ? viewer !== null : true);
  const signIn = (item: string | null) => (signedIn ? null : `/login?next=${encodeURIComponent(href({ item }))}`);
  const from = `${ownerName}'s ${shelf.name}`;

  function forget(sharedIds: string[]) {
    setAdded((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !sharedIds.includes(id))));
  }

  return (
    <section aria-label={`${shelf.name} shelf`} className="mt-10 flex flex-col gap-5 md:mt-14 md:gap-6">
      {access.by === "profile" && <ShelfTabs username={access.username} shelves={shelves} active={shelf.slug} />}
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
      {canAdd && (
        <AddAllButton
          access={access}
          kind={shelf.kind}
          shown={shown}
          tab={status}
          copies={copies}
          signInHref={signIn(null)}
          shelves={yourShelves}
          from={from}
          onAdded={(made) => setAdded((current) => ({ ...current, ...made }))}
          onUndone={forget}
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
          shelfLine={`${from} shelf`}
        >
          {canAdd && (
            <AddToMyShelf
              title={opened}
              access={access}
              kind={shelf.kind}
              signInHref={signIn(opened.id)}
              shelves={yourShelves}
              copy={copies[opened.id] ?? null}
              onAdded={(copy) => setAdded((current) => ({ ...current, [opened.id]: copy }))}
            />
          )}
        </PublicTitleDialog>
      )}
    </section>
  );
}
