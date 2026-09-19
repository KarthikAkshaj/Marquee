import Link from "next/link";
import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { BrandMark } from "@/components/shell/BrandMark";
import { LEGAL } from "@/lib/legal";
import { LegalLinks } from "./LegalLinks";

type LegalPageProps = {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  children: ReactNode;
};

/** /terms and /privacy: a readable column on the dark stage, plain language first. */
export function LegalPage({ eyebrow, title, intro, children }: LegalPageProps) {
  return (
    <div className="relative min-h-dvh px-5 pt-4 pb-10 md:px-15 md:pt-6.5">
      <AmbientBackground variant="empty" />
      <Link href="/" aria-label="Marquee home" className="relative inline-flex min-h-11 items-center rounded-nav">
        <BrandMark variant="header" />
      </Link>

      <main className="relative mx-auto mt-8 max-w-170 md:mt-14">
        <p className="label-mono text-accent">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-balance md:text-[52px]">{title}</h1>
        <p className="mt-3 font-mono text-12 text-text-muted">Last updated {LEGAL.updated}</p>
        <p className="mt-6 text-16 leading-[1.7] text-pretty text-text">{intro}</p>
        <div className="mt-10 flex flex-col gap-9">{children}</div>
      </main>

      <footer className="relative mx-auto mt-14 flex max-w-170 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border pt-4">
        <LegalLinks />
        <Link href="/" className="inline-flex min-h-11 items-center text-13 text-text-muted transition-colors hover:text-text md:min-h-0">
          Back to Marquee
        </Link>
      </footer>
    </div>
  );
}
