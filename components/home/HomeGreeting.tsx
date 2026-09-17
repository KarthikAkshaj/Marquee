"use client";

import { useSyncExternalStore } from "react";
import { dateLine, greetingFor } from "@/lib/home";
import { cn } from "@/lib/utils";

/** Re-read the clock every 15s so the minute on the date line stays honest. */
function subscribe(notify: () => void) {
  const timer = window.setInterval(notify, 15_000);
  return () => window.clearInterval(timer);
}

function readClock() {
  const now = new Date();
  return `${dateLine(now)}|${greetingFor(now.getHours())}`;
}

type HomeGreetingProps = { name: string; line: string };

/**
 * "TUE 16 SEP · 21:40 / Evening, Flux." (SPEC §8.4, handoff §01). The server
 * doesn't know the viewer's time zone, so the date and greeting fade in once
 * the browser has read its own clock.
 */
export function HomeGreeting({ name, line }: HomeGreetingProps) {
  const clock = useSyncExternalStore(subscribe, readClock, () => null);
  const [date, greeting] = clock ? clock.split("|") : ["", "Evening"];
  const fade = cn("transition-opacity duration-300 ease-cinematic motion-reduce:transition-none", !clock && "opacity-0");

  return (
    <header>
      <p className={cn("min-h-3.75 font-mono text-[10px] tracking-[.14em] text-text-muted md:min-h-4 md:text-[11px]", fade)}>{date}</p>
      <h1
        className={cn(
          "mt-2 font-display text-[40px] leading-[1.02] wrap-break-word md:mt-2.5 md:text-[62px] md:leading-none md:tracking-[-.01em]",
          fade,
        )}
      >
        {greeting}, <em className="text-accent">{name}.</em>
      </h1>
      <p className="mt-2.25 text-[13.5px] text-text-muted md:mt-3 md:text-[14.5px]">{line}</p>
    </header>
  );
}
