"use client";

import { useEffect, useRef } from "react";
import { useFxTier } from "@/lib/use-fx-tier";

/** How far a poster leans at its edges, in degrees: enough to feel, not enough to read as a gimmick. */
const LEAN_Y = 9;
const LEAN_X = 7;

const PROPERTIES = ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"] as const;

function settle(poster: HTMLElement) {
  for (const property of PROPERTIES) poster.style.removeProperty(property);
}

/**
 * Posters that lean toward the mouse like a holographic card, with the light
 * following it (U19). One listener for the whole grid, at most one update a
 * frame, and only a few custom properties on the poster under the pointer;
 * the lean is a transform (the `tilt` utility). Mouse only, full tier only.
 * `enabled` rewires it when the grid comes back (from the list view, say).
 */
export function usePosterTilt<T extends HTMLElement>(enabled = true) {
  const area = useRef<T>(null);
  const tier = useFxTier();

  useEffect(() => {
    const node = area.current;
    if (!enabled || !node || tier !== "full" || !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let pointer: PointerEvent | null = null;
    let current: HTMLElement | null = null;

    const lean = () => {
      frame = 0;
      const poster = pointer ? (pointer.target as Element).closest<HTMLElement>("[data-poster]") : null;
      if (poster !== current) {
        if (current) settle(current);
        current = poster;
      }
      if (!poster || !pointer) return;
      // Measure the card around it, which never leans, so the maths doesn't chase its own tilt.
      const card = (poster.parentElement ?? poster).getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (pointer.clientX - card.left) / card.width));
      const y = Math.min(1, Math.max(0, (pointer.clientY - card.top) / (card.width * 1.5)));
      poster.style.setProperty("--tilt-x", `${((0.5 - y) * LEAN_X).toFixed(2)}deg`);
      poster.style.setProperty("--tilt-y", `${((x - 0.5) * LEAN_Y).toFixed(2)}deg`);
      poster.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
      poster.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer = event;
      frame ||= requestAnimationFrame(lean);
    };
    const leave = () => {
      pointer = null;
      frame ||= requestAnimationFrame(lean);
    };

    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
      if (current) settle(current);
    };
  }, [enabled, tier]);

  return area;
}
