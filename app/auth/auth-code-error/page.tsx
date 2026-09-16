import type { Metadata } from "next";
import Link from "next/link";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { BrandMark } from "@/components/shell/BrandMark";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Link didn't work",
  robots: { index: false },
};

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col px-5 pt-5 pb-10 md:px-15 md:pt-6.5">
      <AmbientBackground variant="empty" />
      <Link href="/" aria-label="Marquee home" className="flex min-h-11 items-center self-start rounded-nav">
        <BrandMark variant="header" />
      </Link>
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="font-display text-[40px] leading-[1.05] md:text-[50px]">
          That link <em className="text-accent">fizzled.</em>
        </h1>
        <p className="mt-3.5 max-w-110 text-[15px] leading-[1.6] text-pretty text-text-muted">
          Sign-in links work once, expire after 15 minutes, and only open in the browser you
          asked from. The 6-digit code in the same email works on any device.
        </p>
        <Button asChild className="mt-6">
          <Link href="/login">Get a new code</Link>
        </Button>
      </main>
    </div>
  );
}
