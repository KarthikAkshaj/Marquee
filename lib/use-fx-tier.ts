"use client";

import { useSyncExternalStore } from "react";
import { FX_QUERIES, fxTier, readFxSignals, type FxTier } from "@/lib/fx";

function subscribe(onChange: () => void) {
  const lists = FX_QUERIES.map((query) => window.matchMedia(query));
  for (const list of lists) list.addEventListener("change", onChange);
  return () => {
    for (const list of lists) list.removeEventListener("change", onChange);
  };
}

const snapshot = () => fxTier(readFxSignals());
// The server can't know the device; the full show is what the markup is written for.
const serverSnapshot = (): FxTier => "full";

/** This device's effects tier (U9), following the reduced-motion and transparency settings live. */
export function useFxTier(): FxTier {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
