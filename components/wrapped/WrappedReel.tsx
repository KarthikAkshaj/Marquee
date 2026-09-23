import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CountUp } from "@/components/wrapped/CountUp";
import { Frame } from "@/components/wrapped/Frame";
import { GenreBars } from "@/components/wrapped/GenreBars";
import { WrappedTicket } from "@/components/wrapped/WrappedTicket";
import type { Wrapped } from "@/lib/wrapped";

const BIG = "text-[72px] leading-[.9] tracking-[-.03em] md:text-[104px]";
const LINE = "font-display opsz-120 mt-5 text-[26px] leading-[1.15] text-balance md:text-[34px]";
const UNDER = "mt-3.5 text-[14px] leading-[1.55] text-text-muted md:text-[15.5px]";

/** The year, one frame at a time. Every number comes in already counted. */
export function WrappedReel({ wrapped }: { wrapped: Wrapped }) {
  return (
    <main
      // Scroll-snapped frames, so the year advances a beat at a time. The accent
      // is overridden per viewer: the colour comes off their best cover.
      className="relative h-dvh snap-y snap-mandatory overflow-y-auto"
      style={wrapped.accent ? { ["--color-accent" as string]: wrapped.accent } : undefined}
    >
      {/* The beam stays put and the film moves through it. Tinted by the year's
          own colour, which came off the cover of its best title. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="glow-tint absolute -top-50 left-1/2 h-130 w-200 -translate-x-1/2 blur-[80px] max-md:-top-35 max-md:h-95 max-md:w-120"
          style={{ ["--glow" as string]: "var(--color-accent)" }}
        />
        <div className="vignette-hero absolute inset-0" />
      </div>
      <Frame index={1} label="ARRIVALS">
        <CountUp value={wrapped.added} className={`text-accent ${BIG}`} />
        <h1 className={LINE}>
          titles moved into Marquee in <em className="text-accent">{wrapped.year}</em>.
        </h1>
        <p className={UNDER}>Some you&apos;d been meaning to watch for years. They live here now.</p>
      </Frame>

      <Frame index={2} label="FINISHED">
        <CountUp value={wrapped.finished} className={`text-text ${BIG}`} />
        <h2 className={LINE}>of them you saw all the way through.</h2>
        {wrapped.alreadyWatched > 0 && (
          <p className={UNDER}>
            Another{" "}
            <span className="font-mono tabular-nums text-text">{wrapped.alreadyWatched.toLocaleString()}</span> arrived
            already watched, from before Marquee kept count.
          </p>
        )}
      </Frame>

      <Frame index={3} label="SCREEN TIME">
        <CountUp value={wrapped.episodes} className={`text-text ${BIG}`} />
        <h2 className={LINE}>episodes inside the things you finished.</h2>
        <p className={UNDER}>
          Roughly <span className="font-mono tabular-nums text-text">{wrapped.hours.toLocaleString()}</span> hours of
          watching, give or take. Games keep no clock, so they sat this one out.
        </p>
      </Frame>

      {wrapped.genres.length > 0 && (
        <Frame index={4} label="THE SHAPE OF IT">
          <h2 className="font-display opsz-120 text-[30px] leading-[1.1] text-balance md:text-[40px]">
            What you were <em className="text-accent">in the mood for.</em>
          </h2>
          <GenreBars genres={wrapped.genres} />
        </Frame>
      )}

      {wrapped.top && (
        <Frame index={5} label="TOP BILLING">
          <p className="font-mono text-[13px] tracking-[.2em] text-text-faint">{wrapped.top.categoryName.toUpperCase()}</p>
          <h2 className="font-display opsz-120 mt-4 text-[38px] leading-[1.05] text-balance md:text-[54px]">
            {wrapped.top.title}
          </h2>
          <p className={UNDER}>
            Your highest score of the year:{" "}
            <span className="font-mono tabular-nums text-accent">{wrapped.top.rating}/10</span>
          </p>
        </Frame>
      )}

      <Frame index={6} label="THAT'S THE YEAR">
        <WrappedTicket wrapped={wrapped} />
        <div className="mt-9 flex flex-wrap items-center justify-center gap-2.5">
          {/* A plain anchor: the route answers with the PNG as an attachment,
              and /wrapped is no use to anyone else, so the image is what travels. */}
          <Button asChild variant="secondary">
            <a href="/wrapped/ticket" download>
              Save your ticket
            </a>
          </Button>
          <Button asChild variant="ghost" className="min-h-11 px-4">
            <Link href="/home">Back to your shelves</Link>
          </Button>
        </div>
      </Frame>
    </main>
  );
}
