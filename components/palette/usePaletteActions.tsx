"use client";

import { Dices, LayoutGrid, List, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { categoryHref, parseCategoryParams } from "@/lib/items";
import { categorySlugFromPath } from "@/lib/palette";
import { usePalette } from "./PaletteProvider";

export type PaletteAction = {
  value: string;
  label: string;
  keywords: string;
  icon: ReactNode;
  run: () => void;
};

const icon = "size-3.75";

/** "Actions" (SPEC §8.8). Grid/list only makes sense on a shelf. */
export function usePaletteActions(): PaletteAction[] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = categorySlugFromPath(pathname);
  const { openSurprise } = usePalette();

  const actions: PaletteAction[] = [
    {
      value: "action:surprise",
      label: "Surprise me",
      keywords: "random pick spin roulette decide",
      icon: <Dices aria-hidden className={icon} strokeWidth={1.8} />,
      run: openSurprise,
    },
    {
      value: "action:new-category",
      label: "New category",
      keywords: "add shelf list create",
      icon: <Plus aria-hidden className={icon} strokeWidth={2} />,
      run: () => router.push("/settings/categories?new=1"),
    },
  ];

  if (slug) {
    const params = parseCategoryParams(Object.fromEntries(searchParams.entries()));
    const next = params.view === "grid" ? "list" : "grid";
    actions.push({
      value: "action:view",
      label: `Switch to ${next} view`,
      keywords: "toggle layout grid list view",
      icon: next === "list" ? <List aria-hidden className={icon} strokeWidth={2} /> : <LayoutGrid aria-hidden className={icon} strokeWidth={2} />,
      run: () => router.replace(categoryHref(slug, params, { view: next }), { scroll: false }),
    });
  }

  return actions;
}
