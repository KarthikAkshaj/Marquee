"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { parseCategoryParams, type StatusTab } from "@/lib/items";
import { accessHref, type ShelfAccess } from "@/lib/public-profile";

/**
 * A shared shelf's status tab and open title, kept in the URL like your own
 * shelves (SPEC §8.5, §8.6) but changed in the browser only: the titles are
 * already on the page, so neither needs a trip to the server. Opening a title
 * pushes a history entry, so the phone's back button closes its card. Works
 * the same on a public profile and on a shelf's link.
 */
export function usePublicShelf(access: ShelfAccess, firstShelf: string, shelf: string) {
  const search = useSearchParams();
  const status = parseCategoryParams(Object.fromEntries(search)).status;
  const itemId = search.get("item");
  const pushed = useRef(false);
  const href = (patch: { status?: StatusTab; item?: string | null }) =>
    accessHref(access, firstShelf, { shelf, status, item: null, ...patch });

  useEffect(() => {
    if (!itemId) pushed.current = false;
  }, [itemId]);

  return {
    status,
    itemId,
    href,
    pickStatus(next: StatusTab) {
      window.history.replaceState(null, "", href({ status: next }));
    },
    open(id: string) {
      window.history.pushState(null, "", href({ item: id }));
      pushed.current = true;
    },
    close() {
      if (pushed.current) {
        pushed.current = false;
        window.history.back();
      } else {
        // Arrived with ?item= in the link: there's nothing of ours to go back to.
        window.history.replaceState(null, "", href({}));
      }
    },
  };
}
