import Image from "next/image";
import { initials } from "@/lib/user";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "size-7.5 text-[11.5px] shadow-avatar", px: 30 },
  lg: { box: "size-10.5 text-[15px] shadow-avatar-lg", px: 42 },
  md: { box: "size-11 text-[15px] shadow-avatar", px: 44 },
  xl: { box: "size-24 text-[34px] shadow-avatar-lg md:size-30 md:text-[42px]", px: 120 },
} as const;

type AvatarProps = {
  name: string;
  /** An uploaded or Google photo; without one, initials on a warm, grainy gradient (SPEC §8.10). */
  src?: string | null;
  size: keyof typeof SIZES;
};

/**
 * The viewer's avatar: their photo, or a generated fallback that's never a
 * gray silhouette. Decorative: the name is always printed next to it.
 */
export function Avatar({ name, src, size }: AvatarProps) {
  const { box, px } = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn("avatar-gradient relative flex shrink-0 items-center justify-center overflow-hidden rounded-full", box)}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${px}px`} className="object-cover" />
      ) : (
        <>
          <span className="grain-fine absolute inset-0 opacity-[0.16] mix-blend-soft-light" />
          <span className="relative font-semibold tracking-[.02em] text-avatar-ink">{initials(name)}</span>
        </>
      )}
    </span>
  );
}
