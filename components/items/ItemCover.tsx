import Image from "next/image";
import type { Item } from "@/lib/items";
import { GeneratedCover } from "./GeneratedCover";

type ItemCoverProps = {
  item: Pick<Item, "id" | "cover_url">;
  categoryColor: string;
  /** Rendered width hint for next/image. */
  sizes: string;
};

/** The real cover when there is one, the generated one otherwise. Fills its positioned parent. */
export function ItemCover({ item, categoryColor, sizes }: ItemCoverProps) {
  if (item.cover_url) {
    // The title always sits next to the cover, so the image itself is decorative.
    return <Image src={item.cover_url} alt="" fill sizes={sizes} className="object-cover" />;
  }
  return <GeneratedCover itemId={item.id} categoryColor={categoryColor} />;
}
