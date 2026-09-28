"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { onRoomLight } from "@/lib/room-light";
import { useFxTier } from "@/lib/use-fx-tier";
import { cn } from "@/lib/utils";

/** A pointer passing over a grid shouldn't strobe the room; it has to rest on a poster first. */
const SETTLE_MS = 110;
/** Leaving a poster, the room waits a moment in case the pointer is only crossing to the next. */
const RELEASE_MS = 280;

type Glow = { tints: [string | null, string | null]; front: 0 | 1; on: boolean };

/**
 * The room takes the colour of what you're looking at (U14). `base` is the
 * page's own tint (on Home, the spotlight title's). Over it, hovering a
 * poster crossfades in that title's colour. Two pre-drawn layers swap
 * opacity, so a change repaints once rather than every frame. The hover part
 * is for full-tier devices with a mouse.
 */
export function RoomLight({ base }: { base: string | null }) {
  const tier = useFxTier();
  const [glow, setGlow] = useState<Glow>({ tints: [null, null], front: 0, on: false });

  useEffect(() => {
    if (tier !== "full") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onRoomLight((tint) => {
      clearTimeout(timer);
      timer = setTimeout(
        () =>
          setGlow((now) => {
            if (!tint) return { ...now, on: false };
            if (now.on && now.tints[now.front] === tint) return now;
            // Paint the colour on the layer at the back, then bring it forward.
            const back = now.front === 0 ? 1 : 0;
            const tints: Glow["tints"] = [...now.tints];
            tints[back] = tint;
            return { tints, front: back, on: true };
          }),
        tint ? SETTLE_MS : RELEASE_MS,
      );
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [tier]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {base && <div className="room-light absolute inset-0" style={{ "--tint": base } as CSSProperties} />}
      {glow.tints.map((tint, index) => (
        <div
          key={index}
          className={cn(
            "room-light absolute inset-0 transition-opacity duration-700 ease-cinematic",
            glow.on && glow.front === index ? "opacity-100" : "opacity-0",
          )}
          style={{ "--tint": tint ?? "transparent" } as CSSProperties}
        />
      ))}
    </div>
  );
}
