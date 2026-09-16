import { cn } from "@/lib/utils";

/** Sizes lifted from each place the handoff draws the logo. */
const VARIANTS = {
  mockup: { gap: "gap-1.75", mark: "size-3.5 rounded-[4px] shadow-mark-xs", word: "text-[15px]" },
  mobile: { gap: "gap-2.25", mark: "size-4.5 rounded-[5px] shadow-mark-sm", word: "text-[18px]" },
  card: { gap: "gap-2.5", mark: "size-5 rounded-pill shadow-mark-card", word: "text-[20px]" },
  header: { gap: "gap-2.5", mark: "size-5 rounded-pill shadow-mark", word: "text-[21px]" },
  sidebar: {
    gap: "gap-2.5",
    mark: "size-5.5 rounded-pill shadow-mark",
    word: "text-[24px] tracking-[.01em]",
  },
} as const;

type BrandMarkProps = {
  variant: keyof typeof VARIANTS;
  /** An empty account: the marquee's lights are down. */
  dim?: boolean;
  className?: string;
};

/** The amber bulb and the wordmark. */
export function BrandMark({ variant, dim = false, className }: BrandMarkProps) {
  const size = VARIANTS[variant];
  return (
    <span className={cn("flex items-center", size.gap, className)}>
      <span
        aria-hidden
        className={cn("shrink-0", size.mark, dim ? "bg-accent/35 shadow-mark-dim" : "bg-accent")}
      />
      <span className={cn("font-display leading-none", size.word, dim && "text-text-muted")}>
        Marquee
      </span>
    </span>
  );
}
