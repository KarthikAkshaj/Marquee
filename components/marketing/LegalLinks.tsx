import Link from "next/link";
import { cn } from "@/lib/utils";

type LegalLinksProps = {
  className?: string;
  /** Runs as a link is followed, e.g. to close the sheet it sits in. */
  onGo?: () => void;
};

/** "Terms · Privacy" for the landing, login and legal page footers, Settings and the account sheet (SPEC §8.1, §8.2). */
export function LegalLinks({ className, onGo }: LegalLinksProps) {
  const link = "inline-flex min-h-11 items-center rounded-xs transition-colors hover:text-text md:min-h-0";
  return (
    <nav aria-label="Legal" className={cn("flex items-center gap-2.5 font-mono text-[11px] text-text-muted", className)}>
      <Link href="/terms" onClick={onGo} className={link}>
        Terms
      </Link>
      <span aria-hidden className="text-text-ghost">
        ·
      </span>
      <Link href="/privacy" onClick={onGo} className={link}>
        Privacy
      </Link>
    </nav>
  );
}
