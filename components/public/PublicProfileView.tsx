import { MemberPass } from "@/components/settings/MemberPass";
import { publicStats, type PublicPage } from "@/lib/public-profile";
import { PublicEmpty } from "./PublicEmpty";
import { PublicFrame } from "./PublicFrame";
import { PublicShelfView } from "./PublicShelfView";

type PublicProfileViewProps = {
  page: PublicPage;
  signedIn: boolean;
};

/** Someone's public profile (SPEC §19): their pass, then the shelves they chose to share. */
export function PublicProfileView({ page, signedIn }: PublicProfileViewProps) {
  const name = page.display_name ?? page.username;
  const shelf = page.shelves.find((candidate) => candidate.slug === page.shelf) ?? null;

  return (
    <PublicFrame color={shelf?.color ?? null} signedIn={signedIn}>
      <h1 className="sr-only">{name}&apos;s shelves</h1>
      {page.own && (
        <p className="mx-auto mb-5 flex max-w-155 flex-wrap items-center justify-center gap-x-2 rounded-full border border-accent/25 bg-accent/8 px-4 py-2 text-center text-12 text-text-muted">
          This is your page, as anyone with the link sees it.
          <a href="/settings/profile#sharing" className="text-accent underline-offset-3 hover:underline">
            Change what&apos;s shared
          </a>
        </p>
      )}
      <div className="mx-auto max-w-155">
        <MemberPass name={name} username={page.username} bio={page.bio ?? ""} avatarUrl={page.avatar_url} stats={publicStats(page)} />
      </div>

      {shelf ? (
        <PublicShelfView
          // A new shelf starts on All, with no card open.
          key={shelf.slug}
          username={page.username}
          shelves={page.shelves}
          shelf={shelf}
          titles={page.titles}
          ownerName={name}
          own={page.own}
        />
      ) : (
        <PublicEmpty
          line="Nothing on show yet."
          sentence={page.own ? "Switch a shelf on in Settings and it appears here." : `${name} hasn't put any shelves out yet.`}
          action={page.own ? { href: "/settings/profile#sharing", label: "Choose shelves" } : undefined}
        />
      )}
    </PublicFrame>
  );
}
