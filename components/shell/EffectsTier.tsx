"use client";

import { useEffect } from "react";
import { useFxTier } from "@/lib/use-fx-tier";

/**
 * Writes this device's effects tier onto <html> as `data-fx`, where the
 * `lite:` variant reads it (U9). Until it runs the page is written for the
 * full show; nothing heavy happens before the first interaction anyway.
 */
export function EffectsTier() {
  const tier = useFxTier();
  useEffect(() => {
    document.documentElement.dataset.fx = tier;
  }, [tier]);
  return null;
}
