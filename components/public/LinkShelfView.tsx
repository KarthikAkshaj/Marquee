import Link from "next/link";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { Avatar } from "@/components/user/Avatar";
import { categoryStyle } from "@/lib/categories";
import type { LinkPage } from "@/lib/public-profile";
import { cn } from "@/lib/utils";
import { PublicFrame } from "./PublicFrame";
import { PublicShelfView } from "./PublicShelfView";

type LinkShelfViewProps = {
  page: LinkPage;
  token: string;
  signedIn: boolean;
};

/**
 * One shelf, opened by its link (SPEC §19): whose it is (their name and
 * photo, nothing else of theirs), then the shelf the way a public one reads.
 */
export function LinkShelfView({ page, token, signedIn }: LinkShelfViewProps) {
  const { owner, shelf } = page;
  const name = owner.name ?? "Someone";
  const style = categoryStyle(shelf.color);

  return (
    <PublicFrame color={shelf.color} signedIn={signedIn}>
      {page.own && (
        <p className="mx-auto mb-5 max-w-155 rounded-card border border-accent/25 bg-accent/8 px-4 py-2.5 text-center text-12 text-text-muted md:rounded-full md:py-2">
          This is your shelf&apos;s link, as anyone who has it sees it.{" "}
          <Link href="/settings/profile#sharing" className="text-accent underline-offset-3 hover:underline">
            Manage links
          </Link>
        </p>
      )}
      <header className="mx-auto flex max-w-155 flex-col items-center gap-3 text-center">
        <p className="flex items-center gap-2.5 text-14 text-text-muted">
          <Avatar name={name} src={owner.avatar_url} size="sm" />
          {name} shared this shelf
        </p>
        <h1 className="font-display opsz-120 flex items-center gap-3 text-[40px] leading-none text-balance md:text-[54px]">
          <CategoryIcon name={shelf.icon} className={cn("size-7 shrink-0 md:size-9", style.text)} />
          {shelf.name}
        </h1>
        <p className="flex items-center gap-2 font-mono text-12 text-text-muted md:text-13">
          <span aria-hidden className={cn("size-2 rounded-full", style.dot, style.glow)} />
          {shelf.count} {shelf.count === 1 ? "title" : "titles"}
        </p>
      </header>

      <PublicShelfView
        access={{ by: "link", token }}
        shelves={[shelf]}
        shelf={shelf}
        titles={page.titles}
        ownerName={name}
        own={page.own}
        signedIn={signedIn}
        viewer={page.viewer}
      />
    </PublicFrame>
  );
}
