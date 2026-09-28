import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicProfileView } from "@/components/public/PublicProfileView";
import { publicStats } from "@/lib/public-profile";
import { getPublicPage, isSignedIn } from "@/lib/queries";

// Shared by link, never listed (the user's call, SPEC §19).
const robots = { index: false, follow: false };

type Props = PageProps<"/u/[username]">;

const shelfAsked = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? null;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  // Same arguments as the page, so it's the same single lookup.
  const page = await getPublicPage(username, shelfAsked(query.shelf));
  if (!page) return { title: "Nothing showing", robots };

  const name = page.display_name ?? page.username;
  const { totalTitles } = publicStats(page);
  return {
    title: `${name} (@${page.username})`,
    description: `${name}'s shelves on Marquee: ${totalTitles} ${totalTitles === 1 ? "title" : "titles"} on show.`,
    robots,
  };
}

/**
 * No loading.tsx here on purpose: a streamed skeleton sends a 200 before the
 * lookup, and a missing or private profile has to answer 404. The lookup is a
 * single trip to the database, so the page simply waits for it.
 */
export default async function PublicProfilePage({ params, searchParams }: Props) {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const [page, signedIn] = await Promise.all([getPublicPage(username, shelfAsked(query.shelf)), isSignedIn()]);
  // Private and missing look the same from outside.
  if (!page) notFound();
  if (username !== page.username) redirect(`/u/${page.username}`);

  return <PublicProfileView page={page} signedIn={signedIn} />;
}
