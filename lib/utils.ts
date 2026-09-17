import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default scale names. Without these, a
 * custom size like `text-14` is mistaken for a text *colour* and silently
 * deletes the real colour class it sits next to. Keep in sync with @theme in
 * app/globals.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["12", "13", "14", "16", "20", "28", "40", "56", "80"],
      radius: ["pill", "nav", "card", "tile", "sheet"],
      shadow: [
        "mark",
        "mark-card",
        "mark-sm",
        "mark-xs",
        "mark-dim",
        "cta",
        "cta-sm",
        "cta-md",
        "avatar",
        "avatar-lg",
        "bulb",
        "bulb-warm",
        "bulb-low",
        "dialog",
        "dialog-sm",
        "menu",
        "mockup",
        "modal",
        "card-ring",
        "progress",
        "tab",
        "input-focus",
        "danger",
        "poster",
        "sheet",
        "sheet-up",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ClickLike = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
};

/** A plain left click. Ctrl/⌘/shift/middle clicks should still open the real link in a new tab. */
export function isPlainClick(event: ClickLike) {
  return (
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.defaultPrevented
  );
}
