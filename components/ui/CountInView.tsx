"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTABLE_BELOW, CountValue } from "./CountValue";

/**
 * A number that counts up the first time it scrolls into view (U23). One that
 * was already on screen when the page opened has been read as it is, so it
 * stays put rather than dropping to zero in front of you.
 */
export function CountInView({ value, delayMs = 0 }: { value: number; delayMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || value >= COUNTABLE_BELOW) return;
    const box = node.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setCounting(true);
        watcher.disconnect();
      },
      { threshold: 0.6 },
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      <CountValue value={value} counting={counting} delayMs={delayMs} />
    </span>
  );
}
