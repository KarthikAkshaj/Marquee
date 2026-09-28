"use client";

import { useEffect, useRef } from "react";
import { useFxTier } from "@/lib/use-fx-tier";

/** How far the pass leans at its edges, in degrees: a wide card needs less than a poster. */
const LEAN_Y = 6;
const LEAN_X = 5;

const PROPERTIES = ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y", "--foil-x"] as const;

/**
 * The member pass leaning toward the mouse like a foil card in the hand (U31):
 * the lean (the `tilt` utility), the glare and the foil's sweep all follow the
 * pointer. Measured on the frame around the pass, which never leans, at most
 * once a frame. Mouse only, full tier only; everywhere else the pass lies flat.
 */
export function usePassTilt<Frame extends HTMLElement, Pass extends HTMLElement>() {
  const frame = useRef<Frame>(null);
  const pass = useRef<Pass>(null);
  const tier = useFxTier();

  useEffect(() => {
    const area = frame.current;
    const card = pass.current;
    if (!area || !card || tier !== "full" || !window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;

    let pending = 0;
    let pointer: PointerEvent | null = null;

    const lean = () => {
      pending = 0;
      if (!pointer) {
        for (const property of PROPERTIES) card.style.removeProperty(property);
        return;
      }
      const box = area.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (pointer.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (pointer.clientY - box.top) / box.height));
      card.style.setProperty("--tilt-x", `${((0.5 - y) * LEAN_X).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${((x - 0.5) * LEAN_Y).toFixed(2)}deg`);
      card.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
      // The foil band slides the other way from the light, as it does on a real card.
      card.style.setProperty("--foil-x", `${((0.5 - x) * 40).toFixed(1)}%`);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer = event;
      pending ||= requestAnimationFrame(lean);
    };
    const leave = () => {
      pointer = null;
      pending ||= requestAnimationFrame(lean);
    };

    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", leave);
    return () => {
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(pending);
      for (const property of PROPERTIES) card.style.removeProperty(property);
    };
  }, [tier]);

  return { frame, pass };
}
