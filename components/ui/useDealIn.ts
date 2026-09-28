"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFxTier } from "@/lib/use-fx-tier";

/** Rows dealt one after another; the rest arrive together with the last of them. */
const HAND = 8;
const DEAL: Keyframe[] = [
  { opacity: 0, translate: "0 7px" },
  { opacity: 1, translate: "0 0" },
];

/**
 * Rows of a cmdk list dealing in, 22ms apart (U30): on opening, and when new
 * rows arrive (search results, your titles loading). A row is only ever dealt
 * once, so typing that merely filters the list doesn't replay anything. Runs
 * on the Web Animations API, opacity and translate only; lite devices skip it.
 * `rows` is anything that changes when the rows do, such as their values.
 */
export function useDealIn(list: RefObject<HTMLElement | null>, rows: string) {
  const tier = useFxTier();
  const dealt = useRef(new WeakSet<Element>());

  useEffect(() => {
    const node = list.current;
    if (!node) return;
    const fresh = Array.from(node.querySelectorAll<HTMLElement>("[cmdk-item]")).filter((row) => !dealt.current.has(row));
    for (const row of fresh) dealt.current.add(row);
    if (tier === "lite" || typeof node.animate !== "function") return;

    // Left to finish even if the rows change again: restarting a half-dealt row would flicker.
    fresh.forEach((row, index) =>
      row.animate(DEAL, { duration: 340, delay: Math.min(index, HAND) * 22, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }),
    );
  }, [list, rows, tier]);
}
