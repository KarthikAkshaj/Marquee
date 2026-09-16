import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Variant = "queue" | "dropped" | "posters";

const TINT: Record<Variant, string> = {
  queue: "var(--color-planned)",
  dropped: "var(--color-dropped)",
  posters: "var(--color-accent)",
};

/** Light, shapes-only illustrations for empty tabs (handoff §06). */
export function ShelfIllustration({ variant }: { variant: Variant }) {
  return (
    <div
      aria-hidden
      className="relative h-27 w-62.5 flex-none"
      style={{ "--glow": TINT[variant] } as CSSProperties}
    >
      <div className="glow-tint absolute -bottom-1 left-1/2 h-22.5 w-67.5 -translate-x-1/2 blur-[22px]" />
      {variant === "queue" && <Queue />}
      {variant === "dropped" && <Dropped />}
      {variant === "posters" && <Posters />}
    </div>
  );
}

function Queue() {
  const slots = [
    { height: "h-19.5", ring: "border-white/14", opacity: "opacity-55" },
    { height: "h-24", ring: "border-planned/35", opacity: "opacity-90" },
    { height: "h-19.5", ring: "border-white/14", opacity: "opacity-55" },
  ];
  return (
    <>
      <div className="absolute inset-0 flex items-end justify-center gap-4">
        {slots.map((slot, index) => (
          <div
            key={index}
            className={cn("sign-stand w-14 rounded-[7px] border border-dashed", slot.height, slot.ring, slot.opacity)}
          />
        ))}
      </div>
      <div className="absolute -bottom-2.5 left-1/2 h-px w-52.5 -translate-x-1/2 bg-linear-to-r from-transparent via-planned/40 to-transparent" />
    </>
  );
}

function Dropped() {
  return (
    <>
      <div className="sign-face absolute top-1.5 left-21 h-22 w-15 -rotate-8 rounded-[7px] border border-white/9" />
      <div className="absolute top-4.5 left-28 h-22 w-15 rotate-7 rounded-[7px] border border-dropped/16 bg-linear-170 from-dropped/7 to-transparent" />
      <div className="absolute top-13 left-6 h-px w-50 -rotate-7 bg-linear-to-r from-transparent via-dropped/45 to-transparent" />
    </>
  );
}

function Posters() {
  return (
    <>
      <div className="absolute inset-0 flex items-end justify-center gap-3">
        <div className="sign-face h-19.5 w-13 rounded-[7px] border border-white/10 opacity-60" />
        <div className="sign-face h-24 w-16 rounded-[7px] border border-accent/30" />
        <div className="sign-face h-19.5 w-13 rounded-[7px] border border-white/10 opacity-60" />
      </div>
      <div className="sign-footlight absolute -bottom-2.5 left-1/2 h-px w-52.5 -translate-x-1/2" />
    </>
  );
}
