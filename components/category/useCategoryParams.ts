"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { parseCategoryParams, type CategoryParams } from "@/lib/items";

/**
 * The shelf's tab, view, sort and favourites filter, from the address
 * (SPEC §8.5). The same object until one of them changes, so opening a title,
 * which only changes `?item=`, doesn't redraw the grid.
 */
export function useCategoryParams(): CategoryParams {
  const search = useSearchParams();
  const status = search.get("status") ?? undefined;
  const view = search.get("view") ?? undefined;
  const sort = search.get("sort") ?? undefined;
  const fav = search.get("fav") ?? undefined;
  return useMemo(() => parseCategoryParams({ status, view, sort, fav }), [status, view, sort, fav]);
}
