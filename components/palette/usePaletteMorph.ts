"use client";

import { animate } from "motion/react";
import { useCallback, useLayoutEffect, useState, type RefObject } from "react";
import { useFxTier } from "@/lib/use-fx-tier";

/** The poster flight's spring (U12), so the two openings feel like one family. */
const SPRING = { type: "spring", stiffness: 380, damping: 36 } as const;
/** When the growing box is close enough to call it there: the spring itself takes longer to rest. */
const LAND_MS = 380;

type Source = { rect: DOMRect; radius: string };
type Flight = { source: Source; phase: "flying" | "landed" };

/**
 * The search field growing into the palette (U27). Opened from a control on
 * screen (the sidebar's "Search or add", the phone's search icon, the + button,
 * Home's first "Add"), a glass box grows from that control to the palette's
 * spot on the poster flight's spring, and the palette appears inside it as it
 * lands. Opened from the keyboard there's nothing to grow from, so the panel
 * just arrives (U26). Full tier and a mouse only.
 *
 * `phase` goes on the panel as data-morph: "flying" keeps it hidden and
 * skips its own entrance, "landed" fades it in.
 */
export function usePaletteMorph(panel: RefObject<HTMLElement | null>) {
  const tier = useFxTier();
  const [flight, setFlight] = useState<Flight | null>(null);

  const start = useCallback(
    (from?: HTMLElement) => {
      // Mouse only. On a phone the keyboard slides up as the search field takes
      // focus, and a blurred box resized every frame on top of that stuttered
      // (0.3-0.5s frozen on a mid-range phone); the panel's own drop-in is enough.
      const mouse = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches === true;
      if (!from || tier !== "full" || !mouse) return setFlight(null);
      const rect = from.getBoundingClientRect();
      if (rect.width === 0) return setFlight(null);
      setFlight({ source: { rect, radius: getComputedStyle(from).borderRadius }, phase: "flying" });
    },
    [tier],
  );
  const reset = useCallback(() => setFlight(null), []);

  const flying = flight?.phase === "flying" ? flight.source : null;

  useLayoutEffect(() => {
    if (!flying) return;
    const land = () => setFlight((current) => current && { ...current, phase: "landed" });
    let frame = 0;
    let tries = 0;
    let landed = false;
    let ghost: HTMLDivElement | null = null;
    let stop = () => {};

    // Radix mounts the dialog's portal a render after it opens, so the panel may be a frame or two away.
    const launch = () => {
      const target = panel.current;
      if (!target) {
        if (++tries < 6) frame = requestAnimationFrame(launch);
        else land();
        return;
      }
      const to = target.getBoundingClientRect();
      const box = document.createElement("div");
      box.setAttribute("aria-hidden", "true");
      box.className = "palette-ghost";
      Object.assign(box.style, {
        left: `${flying.rect.left}px`,
        top: `${flying.rect.top}px`,
        width: `${flying.rect.width}px`,
        height: `${flying.rect.height}px`,
        borderRadius: flying.radius,
      });
      document.body.append(box);
      ghost = box;
      const growth = animate(
        box,
        { left: to.left, top: to.top, width: to.width, height: to.height, borderRadius: getComputedStyle(target).borderRadius },
        SPRING,
      );
      // Land once it looks there; the spring's last few pixels settle under the panel's fade.
      const timer = setTimeout(() => {
        landed = true;
        land();
        // Out from under the panel as it fades in, so the swap never blinks.
        void animate(box, { opacity: 0 }, { duration: 0.2 }).then(() => {
          growth.stop();
          box.remove();
        });
      }, LAND_MS);
      stop = () => {
        clearTimeout(timer);
        growth.stop();
      };
    };
    launch();

    // Cut short (closed mid-growth): never leave the box behind.
    return () => {
      cancelAnimationFrame(frame);
      if (landed) return;
      stop();
      ghost?.remove();
    };
  }, [flying, panel]);

  return { phase: flight?.phase, start, reset };
}
