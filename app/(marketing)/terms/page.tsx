import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact } from "@/components/marketing/LegalContact";
import { LegalPage } from "@/components/marketing/LegalPage";
import { LegalSection } from "@/components/marketing/LegalSection";
import { TMDB_NOTICE } from "@/lib/add";

export const metadata: Metadata = {
  title: "Terms",
  description: "The plain-language terms for using Marquee.",
};

/** Short plain-language terms (SPEC §3, §12). */
export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title={
        <>
          The fine print, <em className="text-accent">in large print.</em>
        </>
      }
      intro="Marquee is a free, small personal project for keeping track of anime, movies, series and games. By using it you agree to these terms. They're short on purpose."
    >
      <LegalSection title="Your account">
        <ul>
          <li>One person per account. Keep the email you sign in with secure, since whoever controls it can sign in as you.</li>
          <li>Pick a username that isn&apos;t pretending to be someone else or saying something nasty.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your lists stay yours">
        <p>
          Everything you add, from titles to ratings to notes, belongs to you. Marquee only stores it to show it back to you. You can{" "}
          <Link href="/settings/data">download it</Link> or <Link href="/settings/account">delete it</Link> at any time. The{" "}
          <Link href="/privacy">privacy page</Link> covers the details.
        </p>
      </LegalSection>

      <LegalSection title="Fair use">
        <p>Please don&apos;t:</p>
        <ul>
          <li>try to get at other people&apos;s accounts or data;</li>
          <li>hammer the search or the site with scripts or bots;</li>
          <li>use Marquee for anything illegal, or to store content that isn&apos;t yours to share.</li>
        </ul>
        <p>Accounts that do can be suspended or removed.</p>
      </LegalSection>

      <LegalSection title="Titles, covers and data from elsewhere">
        <p>
          Title details and cover art come from TMDB, AniList and IGDB and belong to their owners. Marquee shows them to help you keep
          track, not as its own. {TMDB_NOTICE}
        </p>
      </LegalSection>

      <LegalSection title="No guarantees">
        <p>
          Marquee is offered as is, for free. It&apos;s looked after with care, but it can have bugs, change, or go offline, and
          search results may be wrong. Keep your own copy of anything that matters: an export takes a couple of seconds. As far as the
          law allows, Marquee isn&apos;t responsible for lost data or any indirect loss from using it.
        </p>
      </LegalSection>

      <LegalSection title="If Marquee closes">
        <p>If Marquee ever shuts down, the plan is to give notice first, with time to download your lists.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          These terms may be updated as Marquee grows. The date at the top shows the latest version, and carrying on using Marquee after
          a change means you accept it.
        </p>
      </LegalSection>

      <LegalSection title="Questions">
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
