import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkShelfView } from "@/components/public/LinkShelfView";
import { getLinkPage, isSignedIn } from "@/lib/queries";

// A link is for the people it's sent to, never for search.
const robots = { index: false, follow: false };

type Props = PageProps<"/s/[token]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  // Same argument as the page, so it's the same single lookup.
  const page = await getLinkPage(token);
  if (!page) return { title: "Nothing showing", robots };

  const name = page.owner.name ?? "Someone";
  const count = `${page.shelf.count} ${page.shelf.count === 1 ? "title" : "titles"}`;
  return {
    title: `${name}'s ${page.shelf.name}`,
    description: `${name} shared their ${page.shelf.name} shelf on Marquee: ${count}.`,
    robots,
  };
}

/**
 * One shelf by its secret link (SPEC §19). No loading.tsx here, like the
 * public profile: a streamed skeleton sends a 200 before the lookup, and a
 * link that's been turned off has to answer 404.
 */
export default async function ShelfLinkPage({ params }: Props) {
  const { token } = await params;
  const [page, signedIn] = await Promise.all([getLinkPage(token), isSignedIn()]);
  if (!page) notFound();

  return <LinkShelfView page={page} token={token} signedIn={signedIn} />;
}
