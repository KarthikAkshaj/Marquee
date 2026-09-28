import Image from "next/image";
import { GeneratedCover } from "@/components/items/GeneratedCover";
import type { SearchResult } from "@/lib/search/types";

type MatchCoverProps = {
  result: Pick<SearchResult, "coverUrl" | "externalId">;
  categoryColor: string;
  /** In the first screenful of rows: load at once, since one of these is what the page paints first. */
  eager?: boolean;
};

/** A candidate's small 2:3 cover, or a generated one when the service has none. */
export function MatchCover({ result, categoryColor, eager = false }: MatchCoverProps) {
  return (
    <span data-cover className="relative h-12.5 w-8.5 shrink-0 overflow-hidden rounded-[5px] border border-white/8 transition-opacity">
      {result.coverUrl ? (
        <Image src={result.coverUrl} alt="" fill sizes="34px" loading={eager ? "eager" : "lazy"} className="object-cover" />
      ) : (
        <GeneratedCover itemId={result.externalId} categoryColor={categoryColor} />
      )}
    </span>
  );
}
