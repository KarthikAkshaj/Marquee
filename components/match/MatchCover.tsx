import Image from "next/image";
import { GeneratedCover } from "@/components/items/GeneratedCover";
import type { SearchResult } from "@/lib/search/types";

type MatchCoverProps = {
  result: Pick<SearchResult, "coverUrl" | "externalId">;
  categoryColor: string;
};

/** A candidate's small 2:3 cover, or a generated one when the service has none. */
export function MatchCover({ result, categoryColor }: MatchCoverProps) {
  return (
    <span className="relative h-12.5 w-8.5 shrink-0 overflow-hidden rounded-[5px] border border-white/8">
      {result.coverUrl ? (
        <Image src={result.coverUrl} alt="" fill sizes="34px" className="object-cover" />
      ) : (
        <GeneratedCover itemId={result.externalId} categoryColor={categoryColor} />
      )}
    </span>
  );
}
