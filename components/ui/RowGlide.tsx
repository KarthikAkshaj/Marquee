"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * One highlight that glides from row to row in a cmdk list (U28), instead of
 * each row lighting up on its own. Render it as the list's last child, so the
 * rows have their values before it looks for the active one, and put
 * `rowGlideList` on the Command.List. Rows inside [data-glide-off] (the sticky
 * "Add manually") keep their own highlight: they don't scroll with the rest.
 */
export function RowGlide({ active }: { active: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(false);

  useLayoutEffect(() => {
    const glide = ref.current;
    const box = glide?.parentElement;
    if (!glide || !box) return;

    function place() {
      if (!glide || !box) return;
      const row = Array.from(box.querySelectorAll<HTMLElement>("[cmdk-item]")).find(
        (item) => item.getAttribute("data-value") === active,
      );
      if (!row || row.closest("[data-glide-off]")) {
        glide.style.opacity = "0";
        shown.current = false;
        return;
      }
      // Layout offsets, not screen boxes: the panel may still be scaling in.
      let x = 0;
      let y = 0;
      for (let step: HTMLElement | null = row; step && step !== box; step = step.offsetParent as HTMLElement | null) {
        x += step.offsetLeft;
        y += step.offsetTop;
      }
      // Arriving from nowhere it appears in place; after that it glides.
      glide.style.transitionProperty = shown.current ? "" : "none";
      glide.style.translate = `${x}px ${y}px`;
      glide.style.width = `${row.offsetWidth}px`;
      glide.style.height = `${row.offsetHeight}px`;
      glide.style.opacity = "1";
      shown.current = true;
    }

    place();
    // Results arriving or a row growing moves everything under it.
    const observer = new ResizeObserver(place);
    observer.observe(box);
    return () => observer.disconnect();
  });

  return <span ref={ref} aria-hidden className="row-glide" />;
}

/** On the Command.List: the rows' wrapper holds the highlight behind them. */
export const rowGlideList = "[&>[cmdk-list-sizer]]:relative [&>[cmdk-list-sizer]]:isolate";
