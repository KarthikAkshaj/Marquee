import Link from "next/link";
import type { ReactNode } from "react";
import { LegalLinks } from "@/components/marketing/LegalLinks";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { BrandMark } from "@/components/shell/BrandMark";
import { Button } from "@/components/ui/Button";

type PublicFrameProps = {
  /** The open shelf's colour washes the room; no shelf, the usual amber and red. */
  color: string | null;
  signedIn: boolean;
  children: ReactNode;
};

/** The stage a public profile stands on: brand, a way in or back, and the credits. */
export function PublicFrame({ color, signedIn, children }: PublicFrameProps) {
  return (
    <div className="relative flex min-h-dvh flex-col px-5 pt-4 pb-8 md:px-10 md:pt-6.5">
      {color ? <AmbientBackground variant="category" color={color} /> : <AmbientBackground variant="app" />}
      <header className="relative flex items-center justify-between gap-3">
        <Link href="/" aria-label="Marquee home" className="inline-flex min-h-11 items-center rounded-nav">
          <BrandMark variant="header" />
        </Link>
        {signedIn ? (
          <Button asChild variant="secondary" className="h-10 px-4 text-13">
            <Link href="/home">Your shelves</Link>
          </Button>
        ) : (
          <Button asChild className="h-10 px-4 text-13 shadow-cta-sm">
            <Link href="/login">Start your own</Link>
          </Button>
        )}
      </header>

      <main className="relative mx-auto mt-6 w-full max-w-300 flex-1 md:mt-10">{children}</main>

      <footer className="relative mt-16 flex flex-col items-center gap-2 text-center">
        <p className="text-12 text-text-muted">
          Kept on{" "}
          <Link href="/" className="text-text underline underline-offset-3 hover:text-accent-bright">
            Marquee
          </Link>
          , a home for the anime, films, series and games you love.
        </p>
        <LegalLinks />
      </footer>
    </div>
  );
}
