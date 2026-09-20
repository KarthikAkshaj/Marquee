import type { Metadata } from "next";
import Link from "next/link";
import { LegalContact } from "@/components/marketing/LegalContact";
import { LegalPage } from "@/components/marketing/LegalPage";
import { LegalSection } from "@/components/marketing/LegalSection";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Marquee stores, who helps run it, and how to take your data out or delete it.",
};

/** What's stored, Google sign-in data, and how to leave (SPEC §3, §12). */
export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title={
        <>
          Your lists are <em className="text-accent">yours.</em>
        </>
      }
      intro="Marquee is a small personal project for keeping track of what you watch and play. This page says, in plain words, what it keeps about you and what it doesn't."
    >
      <LegalSection title="The short version">
        <ul>
          <li>Your lists are private. Only you can see them, and the database itself enforces that.</li>
          <li>No ads, no analytics, no tracking scripts. Your data is never sold or shared for marketing.</li>
          <li>You can download everything, or delete your account and all of it, whenever you like.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What Marquee stores">
        <ul>
          <li>
            <strong>Your account:</strong> your email address, used to sign you in. If you continue with Google, Google also shares your
            name and profile photo; Marquee uses them as your starting display name and avatar. It never sees your Google password.
          </li>
          <li>
            <strong>Your profile:</strong> your username, display name, bio, and any photo you upload.
          </li>
          <li>
            <strong>Your lists:</strong> your categories and the titles on them, with their status, progress, ratings, notes, dates and
            favourites, plus the details copied in when you add a title from search (cover, release year, episode count, genres and
            community score).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Marquee sets only the cookies that keep you signed in. There are no advertising or tracking cookies, and nothing is stored in
          your browser for anything else.
        </p>
      </LegalSection>

      <LegalSection title="Who helps run it">
        <ul>
          <li>
            <strong>Supabase</strong> hosts the database, sign-in and uploaded photos.
          </li>
          <li>
            <strong>Vercel</strong> hosts the website.
          </li>
          <li>
            <strong>Google</strong> signs you in if you choose &ldquo;Continue with Google&rdquo;, and Gmail delivers the sign-in codes.
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong> checks that a person, not a bot, is asking for a sign-in code. It sees your IP address and some
            details about your browser, and nothing about your lists.
          </li>
          <li>
            <strong>TMDB, AniList and IGDB</strong> answer title searches. When you search, the words you type are sent to them from
            Marquee&apos;s server; your account details never are. Covers you see are loaded from their image servers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Emails">
        <p>
          Marquee only emails you sign-in codes and links, and confirmations when you change your address. No newsletters, no
          marketing.
        </p>
      </LegalSection>

      <LegalSection title="Taking your data out, or deleting it">
        <ul>
          <li>
            <strong>Download it:</strong> <Link href="/settings/data">Settings → Data</Link> gives you everything as one JSON file, or any
            list as a spreadsheet-friendly CSV.
          </li>
          <li>
            <strong>Delete it:</strong> <Link href="/settings/account">Settings → Account</Link> deletes your account, profile, lists,
            titles and photo straight away. There&apos;s no undo. Copies can linger in the hosting providers&apos; backups for a short
            while before they&apos;re gone for good.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Children">
        <p>Marquee isn&apos;t meant for children under 13, and doesn&apos;t knowingly keep their data.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>If this page changes, the date at the top changes with it.</p>
      </LegalSection>

      <LegalSection title="Questions">
        <LegalContact />
      </LegalSection>
    </LegalPage>
  );
}
