"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { useFxTier } from "@/lib/use-fx-tier";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** A new entry switching on like a sign: a neon sputter, its dot flaring, its row washed once in its colour. */
function lightUp(item: HTMLElement) {
  item.animate(
    [
      { opacity: 0 },
      { opacity: 1, offset: 0.12 },
      { opacity: 0.25, offset: 0.2 },
      { opacity: 1, offset: 0.32 },
      { opacity: 0.55, offset: 0.4 },
      { opacity: 1 },
    ],
    { duration: 950, easing: "linear" },
  );
  item.querySelector("[data-arrival-dot]")?.animate(
    [{ scale: 2.4, filter: "brightness(1.8)" }, { scale: 1, filter: "brightness(1)" }],
    { duration: 900, delay: 300, easing: EASE, fill: "backwards" },
  );
  item.querySelector("[data-arrival-wash]")?.animate(
    [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }],
    { duration: 1800, delay: 250, easing: "ease-out" },
  );
}

/**
 * A list whose new entries light up as they arrive (U35): a category made in
 * Settings switches on in the sidebar and in the list, bulb-bright. Items
 * carry `data-arrival` with a stable id; anything already there when the
 * list first renders is simply there. Lite devices skip the show.
 */
export function ArrivalList({ children, ...props }: ComponentProps<"ul">) {
  const list = useRef<HTMLUListElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const tier = useFxTier();

  useEffect(() => {
    const items = Array.from(list.current?.querySelectorAll<HTMLElement>("[data-arrival]") ?? []);
    if (seen.current === null) {
      seen.current = new Set(items.map((item) => item.dataset.arrival ?? ""));
      return;
    }
    for (const item of items) {
      const id = item.dataset.arrival ?? "";
      if (seen.current.has(id)) continue;
      seen.current.add(id);
      if (tier !== "lite" && typeof item.animate === "function") lightUp(item);
    }
  });

  return (
    <ul {...props} ref={list}>
      {children}
    </ul>
  );
}
