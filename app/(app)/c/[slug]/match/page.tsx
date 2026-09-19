import type { Metadata } from "next";
import Link from "next/link";
import { MatchFlow } from "@/components/match/MatchFlow";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { SOURCE_FOR_KIND, SOURCE_NAMES, searchKindOf } from "@/lib/add";
import { getCategoryBySlug, getManualTitles, getShelfMatches } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/c/[slug]/match">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: `Find covers · ${category.name}` };
}

/** Find covers (SPEC §8.9 step 6): match a shelf's hand-added titles to AniList, TMDB or IGDB. */
export default async function MatchPage({ params }: PageProps<"/c/[slug]/match">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  const kind = searchKindOf(category.kind);
  const back = `/c/${encodeURIComponent(category.slug)}`;

  if (!kind) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="font-display text-[34px] leading-[1.05] md:text-[46px]">Nothing to look up here.</h1>
        <p className="text-14 text-text-muted">{category.name} is a custom shelf, so there&apos;s no service to match its titles against.</p>
        <Link href={back} className="text-14 text-accent hover:text-accent-bright">
          Back to {category.name}
        </Link>
      </div>
    );
  }

  const [items, taken] = await Promise.all([getManualTitles(category.id), getShelfMatches(category.id)]);
  const source = SOURCE_NAMES[SOURCE_FOR_KIND[kind]];

  return (
    <>
      <AmbientBackground variant="category" color={category.color} />
      <div className="flex flex-col gap-5.5">
        <header>
          <Link href={back} className="font-mono text-[10px] tracking-[.14em] text-text-muted uppercase hover:text-text md:text-[11px]">
            ← {category.name}
          </Link>
          <h1 className="mt-2.25 font-display text-[34px] leading-[1.05] md:text-[46px] md:leading-none">
            Put <em className="text-accent">faces</em> to the names.
          </h1>
          <p className="mt-2.5 max-w-150 text-[13.5px] text-text-muted md:text-14">
            We looked up each title you added by hand on {source}. Tick the right matches and they get covers, years, episode counts
            and genres. Your statuses, ratings and notes stay as they are.
          </p>
        </header>
        <MatchFlow
          shelf={{ id: category.id, name: category.name, slug: category.slug, color: category.color, kind }}
          items={items}
          taken={taken}
        />
      </div>
    </>
  );
}
