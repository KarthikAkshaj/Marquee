import Link from "next/link";
import { FooterAttributions } from "@/components/marketing/Attributions";
import { FeatureStrip } from "@/components/marketing/FeatureStrip";
import { HomeMockup } from "@/components/marketing/HomeMockup";
import { PosterWall } from "@/components/marketing/PosterWall";
import { BrandMark } from "@/components/shell/BrandMark";
import { Button } from "@/components/ui/Button";

/** Landing, signed out (handoff: Marquee Landing §05 desktop, §07 phone). */
export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-130 overflow-hidden md:h-165">
        <PosterWall
          rows={[
            { offset: 0, drift: "animate-drift-a [animation-duration:60s]" },
            { offset: 5, drift: "animate-drift-b [animation-duration:82s]" },
          ]}
          className="inset-[-20%] gap-4.5 opacity-55 blur-[20px] saturate-[1.15] md:hidden"
          rowClassName="gap-4.5"
          tileClassName="h-47.5 rounded-xl"
        />
        <PosterWall
          rows={[
            { offset: 0, drift: "animate-drift-a" },
            { offset: 3, drift: "animate-drift-b" },
            { offset: 5, drift: "animate-drift-c" },
          ]}
          className="inset-[-14%_-8%] hidden gap-6.5 opacity-78 blur-[16px] saturate-[1.25] md:flex"
          rowClassName="gap-6.5"
          tileClassName="h-62.5 rounded-tile"
        />
        <div className="scrim-hero-mobile absolute inset-0 md:hidden" />
        <div className="scrim-hero-side absolute inset-0 hidden md:block" />
        <div className="scrim-hero-bottom absolute inset-0 hidden md:block" />
      </div>
      <div aria-hidden className="vignette-hero pointer-events-none absolute inset-0 z-6" />

      <header className="relative z-8 flex items-center justify-between px-5 pt-5.5 md:px-15 md:py-6.5">
        <BrandMark variant="mobile" className="md:hidden" />
        <BrandMark variant="header" className="hidden md:flex" />
        <nav aria-label="Site" className="flex items-center gap-5.5">
          <a href="#features" className="hidden text-[13.5px] text-text-muted hover:text-text md:inline">
            What is it?
          </a>
          <Link
            href="/login"
            className="-mr-2 inline-flex min-h-11 items-center px-2 text-13 text-text-muted hover:text-accent md:mr-0 md:min-h-0 md:px-0 md:text-[13.5px] md:text-text"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="relative z-8 px-6 pt-18.5 md:max-w-168 md:px-15 md:pt-19.5 xl:min-h-197.5">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/9 bg-white/5 px-2.75 py-1 md:gap-2.25 md:px-3.25 md:py-1.25">
          <span aria-hidden className="size-1.25 rounded-full bg-completed" />
          <span className="font-mono text-[9.5px] tracking-[.1em] text-text-muted md:text-[10.5px]">
            FREE · NO SPREADSHEETS
          </span>
        </p>

        <h1 className="font-display opsz-144 mt-4.5 text-[82px] leading-[.88] tracking-[-.03em] md:mt-5.5 md:text-[136px]">
          Mar<em className="text-accent">quee</em>
        </h1>

        <p className="mt-5 text-[17px] leading-[1.42] text-balance md:mt-6.5 md:text-[23px] md:leading-[1.45]">
          Everything you&apos;ve watched, are watching, <br className="hidden md:inline" />
          and swear you&apos;ll get to.
        </p>
        <p className="mt-3 text-[13.5px] leading-normal text-text-muted md:mt-3.5 md:max-w-110 md:text-[15px] md:leading-[1.55]">
          Anime, films, series, games — plus any list you{" "}
          <span className="md:hidden">invent.</span>
          <span className="hidden md:inline">
            feel like inventing. Your Word doc is safe now.
          </span>
        </p>

        <div className="mt-6.5 flex flex-col gap-3 md:mt-9.5 md:flex-row md:items-center md:gap-4.5">
          <Button asChild size="lg" className="shadow-cta max-md:rounded-[11px] max-md:py-3.75">
            <Link href="/login">Get started — it&apos;s free</Link>
          </Button>
          <p className="text-center text-[12.5px] text-text-muted md:text-13">
            One email code, ten seconds, done.
          </p>
        </div>
      </main>

      <HomeMockup />

      <div className="mt-auto pt-12 md:pt-0">
        <FeatureStrip />
        <footer className="relative z-8 flex flex-col gap-1.75 bg-sunken px-5 pt-3.5 pb-5.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-7 md:border-t md:border-white/6 md:px-15 md:py-4.5">
          <FooterAttributions />
          <span className="hidden font-mono text-[11px] text-text-muted md:inline">
            {new Date().getFullYear()}
          </span>
        </footer>
      </div>
    </div>
  );
}
