"use client";

import Image from "next/image";
import { useState } from "react";
import type { Item } from "@/lib/items";
import { GeneratedCover } from "./GeneratedCover";

type ItemCoverProps = {
  item: Pick<Item, "id" | "cover_url">;
  categoryColor: string;
  /** Rendered width hint for next/image. */
  sizes: string;
  /**
   * In the first screenful: load at once instead of waiting to be scrolled
   * near. One of these is usually what the browser counts as the page painted.
   */
  eager?: boolean;
};

/**
 * The real cover when there is one, the generated one otherwise, including
 * when a stored cover stops loading (a provider moved it). Never a broken
 * image. Fills its positioned parent.
 */
export function ItemCover({ item, categoryColor, sizes, eager = false }: ItemCoverProps) {
  const [failed, setFailed] = useState<string | null>(null);

  if (item.cover_url && failed !== item.cover_url) {
    // The title always sits next to the cover, so the image itself is decorative.
    return (
      <Image
        src={item.cover_url}
        alt=""
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        className="object-cover"
        onError={() => setFailed(item.cover_url)}
      />
    );
  }
  return <GeneratedCover itemId={item.id} categoryColor={categoryColor} />;
}
