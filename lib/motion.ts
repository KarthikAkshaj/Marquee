import type { CSSProperties } from "react";

/** How many items in a grid rise in one after another; the rest just appear (SPEC §9.6). */
export const STAGGER_LIMIT = 24;
export const STAGGER_MS = 30;

/**
 * Spread onto a grid item: it fades up 8px, 30ms after the one before it.
 * Reduced motion turns the animation and its delay off (globals.css).
 * `className` is the item's own, kept alongside (a spread would drop it).
 */
export function rise(index: number, className?: string): { className?: string; style?: CSSProperties } {
  if (index >= STAGGER_LIMIT) return { className };
  return { className: className ? `animate-rise ${className}` : "animate-rise", style: { animationDelay: `${index * STAGGER_MS}ms` } };
}
