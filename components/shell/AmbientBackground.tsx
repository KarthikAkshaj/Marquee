import type { CSSProperties } from "react";
import { isCategoryColor } from "@/lib/categories";

type AmbientBackgroundProps =
  | { variant: "app" | "empty" }
  | { variant: "category"; color: string };

/**
 * The light in the room (SPEC §9.3). `app` is the populated screen: amber from
 * the upper left, a warm red from the right. `empty` is the lights-down state.
 * `category` washes the page in that category's colour.
 * Vignettes sit behind content: they darken the room, never the text
 * (over content they pushed sidebar text below WCAG AA contrast).
 */
export function AmbientBackground(props: AmbientBackgroundProps) {
  if (props.variant === "category") {
    const token = isCategoryColor(props.color) ? props.color : "amber";
    return (
      <div aria-hidden className="pointer-events-none">
        <div
          className="fixed inset-0 -z-10 overflow-hidden"
          style={{ "--glow": `var(--color-cat-${token})` } as CSSProperties}
        >
          <div className="glow-tint absolute -top-60 left-30 h-120 w-190 blur-[70px] max-md:-top-47.5 max-md:-left-10 max-md:h-95 max-md:w-117.5 max-md:blur-[60px]" />
        </div>
        <div className="vignette-category fixed inset-0 -z-10" />
      </div>
    );
  }

  if (props.variant === "empty") {
    return (
      <div aria-hidden className="pointer-events-none">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="glow-amber-soft absolute top-30 left-160 h-130 w-175 blur-[70px] max-md:left-1/2 max-md:w-105 max-md:-translate-x-1/2" />
        </div>
        <div className="vignette-empty fixed inset-0 -z-10" />
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="glow-amber absolute -top-55 left-45 h-115 w-155 blur-[60px] max-md:-top-45 max-md:left-5 max-md:h-90 max-md:w-105 max-md:blur-[50px]" />
        <div className="glow-crimson absolute -top-40 -right-15 h-105 w-130 blur-[70px] max-md:-top-30 max-md:-right-35 max-md:h-80 max-md:w-90 max-md:blur-[60px]" />
      </div>
      <div className="vignette-app fixed inset-0 -z-10" />
    </div>
  );
}
