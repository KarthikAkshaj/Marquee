"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { categoryHref, itemHref, type CategoryParams } from "@/lib/items";

/**
 * The open title lives in `?item=` (SPEC §8.6) so it's linkable. Opening pushes
 * a history entry in the browser only: no server round trip, and the phone's
 * back button closes the sheet.
 */
export function useOpenItem(slug: string, params: CategoryParams) {
  const itemId = useSearchParams().get("item");
  // Whether the entry we're on was pushed by open(), so close() can step back off it.
  const pushed = useRef(false);

  useEffect(() => {
    if (!itemId) pushed.current = false;
  }, [itemId]);

  return {
    itemId,
    open(id: string) {
      window.history.pushState(null, "", itemHref(slug, params, id));
      pushed.current = true;
    },
    close() {
      if (pushed.current) {
        pushed.current = false;
        window.history.back();
      } else {
        // Arrived with ?item= in the link: there's nothing of ours to go back to.
        window.history.replaceState(null, "", categoryHref(slug, params));
      }
    },
  };
}
