import Link from "next/link";
import { cn } from "@/lib/utils";

/** "Terms · Privacy" for the landing, login and legal page footers (SPEC §8.1, §8.2). */
export function LegalLinks({ className }: { className?: string }) {
  const link = "inline-flex min-h-11 items-center rounded-xs transition-colors hover:text-text md:min-h-0";
  return (
    <nav aria-label="Legal" className={cn("flex items-center gap-2.5 font-mono text-[11px] text-text-muted", className)}>
      <Link href="/terms" className={link}>
        Terms
      </Link>
      <span aria-hidden className="text-text-ghost">
        ·
      </span>
      <Link href="/privacy" className={link}>
        Privacy
      </Link>
    </nav>
  );
}
