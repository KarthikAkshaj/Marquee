"use client";

import { animate } from "motion/react";
import { useLayoutEffect, useRef } from "react";
import { useFxTier } from "@/lib/use-fx-tier";

/** The sheet's own spring, so the poster and the sheet land together. */
const SPRING = { type: "spring", stiffness: 380, damping: 36 } as const;

/** A press this recent on a poster is what opened the sheet; anything older (a shared link, Back) isn't. */
const PRESS_WINDOW_MS = 1000;

let lastPress: { id: string; at: number } | null = null;

/** A poster in the grid was clicked to open its title: the sheet will fly it in. */
export function notePosterPress(id: string) {
  lastPress = { id, at: performance.now() };
}

const posterOf = (id: string) => document.querySelector<HTMLElement>(`[data-poster="${CSS.escape(id)}"]`);
const sheetPoster = () => document.querySelector<HTMLElement>("[data-sheet-poster]");

function onScreen(rect: DOMRect) {
  return rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

/**
 * Flies a copy of a poster's art from one box to another, then calls `landed`.
 * The copy sits at the destination and is transformed out to the start, so
 * only transform moves. Returns a way to cut it short.
 */
function fly(art: Element, from: DOMRect, to: DOMRect, landed: () => void) {
  const copy = document.createElement("div");
  copy.setAttribute("aria-hidden", "true");
  Object.assign(copy.style, {
    position: "fixed",
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    zIndex: "60",
    overflow: "hidden",
    borderRadius: "10px",
    pointerEvents: "none",
    transformOrigin: "0 0",
    boxShadow: "0 24px 60px rgb(0 0 0 / 0.55)",
  });
  copy.append(art.cloneNode(true));
  document.body.append(copy);

  const flight = animate(
    copy,
    {
      x: [from.left - to.left, 0],
      y: [from.top - to.top, 0],
      scaleX: [from.width / to.width, 1],
      scaleY: [from.height / to.height, 1],
    },
    SPRING,
  );
  void flight.then(() => {
    landed();
    copy.remove();
  });
  return () => {
    flight.stop();
    copy.remove();
  };
}

/** Shows an element again once its own image has loaded, so the swap back from the copy never flashes. */
function reveal(element: HTMLElement) {
  const image = element.querySelector("img");
  const show = () => (element.style.opacity = "");
  if (!image || image.complete) return show();
  image.addEventListener("load", show, { once: true });
  image.addEventListener("error", show, { once: true });
  setTimeout(show, 1500);
}

/**
 * The poster grows into the title sheet and back (U12). Opening from a
 * poster, its art flies from the grid into the sheet's poster spot on the
 * sheet's own spring while the sheet slides in, leaving a gap in the grid;
 * closing, it flies back into the gap. Only for a press on a poster that's on
 * screen, and only on the full effects tier. Everything else opens plainly.
 */
export function usePosterFlight(itemId: string | null, docked: "right" | "bottom") {
  const tier = useFxTier();
  const previous = useRef<string | null>(null);
  // The title whose grid poster is hidden while its sheet is open.
  const lifted = useRef<string | null>(null);

  useLayoutEffect(() => {
    const was = previous.current;
    previous.current = itemId;

    // Closing (or switching titles): fly back into the gap, or just fill it.
    if (was && was !== itemId && lifted.current === was) {
      lifted.current = null;
      const card = posterOf(was);
      const open = sheetPoster();
      const art = card?.querySelector("[data-poster-art]");
      if (card && open && art && tier === "full" && onScreen(card.getBoundingClientRect())) {
        const from = open.getBoundingClientRect();
        open.style.opacity = "0";
        fly(art, from, card.getBoundingClientRect(), () => reveal(card));
      } else if (card) {
        card.style.opacity = "";
      }
    }

    if (!itemId || tier !== "full") return;
    const press = lastPress;
    lastPress = null;
    if (!press || press.id !== itemId || performance.now() - press.at > PRESS_WINDOW_MS) return;

    const card = posterOf(itemId);
    const art = card?.querySelector("[data-poster-art]");
    if (!card || !art) return;
    const from = card.getBoundingClientRect();
    if (!onScreen(from)) return;

    let stop: (() => void) | null = null;
    let target: HTMLElement | null = null;
    let frame = 0;
    let tries = 0;
    // Radix mounts the sheet's portal a render after it opens, so its poster may be a frame or two away.
    // The sheet starts off screen, so waiting for it shows nothing.
    const launch = () => {
      target = sheetPoster();
      const panel = target?.closest<HTMLElement>("[data-sheet-panel]");
      if (!target || !panel) {
        if (++tries < 6) frame = requestAnimationFrame(launch);
        return;
      }
      // Aim for where the sheet stops, not where it is on its way in.
      const sheet = panel.getBoundingClientRect();
      const dx = docked === "right" ? window.innerWidth - sheet.width - sheet.left : 0;
      const dy = docked === "bottom" ? window.innerHeight - sheet.height - sheet.top : 0;
      const spot = target.getBoundingClientRect();
      const to = new DOMRect(spot.left + dx, spot.top + dy, spot.width, spot.height);

      card.style.opacity = "0";
      target.style.opacity = "0";
      lifted.current = itemId;
      const landing = target;
      stop = fly(art, card.getBoundingClientRect(), to, () => reveal(landing));
    };
    launch();

    // Cut short (closed mid-flight, or the window changed shape): never leave the sheet's poster hidden.
    return () => {
      cancelAnimationFrame(frame);
      stop?.();
      if (target) target.style.opacity = "";
    };
  }, [itemId, docked, tier]);
}
