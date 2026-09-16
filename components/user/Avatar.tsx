import { initials } from "@/lib/user";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-7.5 text-[11.5px] shadow-avatar",
  lg: "size-10.5 text-[15px] shadow-avatar-lg",
} as const;

/**
 * Generated fallback avatar: initials on a warm, grainy gradient — never a
 * gray silhouette (SPEC §8.10). Uploaded photos arrive with Settings → Profile.
 * Decorative: the name is always printed right next to it.
 */
export function Avatar({ name, size }: { name: string; size: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden
      className={cn(
        "avatar-gradient relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        SIZES[size],
      )}
    >
      <span className="grain-fine absolute inset-0 opacity-[0.16] mix-blend-soft-light" />
      <span className="relative font-semibold tracking-[.02em] text-avatar-ink">
        {initials(name)}
      </span>
    </span>
  );
}
