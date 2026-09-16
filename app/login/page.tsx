import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { CenteredAttributions } from "@/components/marketing/Attributions";
import { PosterWall } from "@/components/marketing/PosterWall";
import { BrandMark } from "@/components/shell/BrandMark";
import { safeRedirectPath } from "@/lib/validators";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

/** Login (handoff: Marquee Landing §06 desktop, §07 phone). */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeRedirectPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-5 pt-4 pb-6 md:items-center md:justify-center md:gap-5.5 md:p-0">
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <PosterWall
          rows={[
            { offset: 3, drift: "animate-drift-a [animation-duration:70s]" },
            { offset: 0, drift: "animate-drift-c [animation-duration:88s]" },
          ]}
          className="inset-[-20%] gap-4.5 opacity-38 blur-[26px] saturate-[1.1] md:inset-[-16%_-8%] md:gap-6.5 md:opacity-40 md:blur-[30px]"
          rowClassName="gap-4.5 md:gap-6.5"
          tileClassName="h-75 rounded-xl md:rounded-tile"
        />
        <div className="scrim-login absolute inset-0" />
      </div>
      <div aria-hidden className="vignette-login pointer-events-none absolute inset-0 z-5" />

      <Link
        href="/"
        aria-label="Marquee home"
        className="relative z-7 mt-2 flex min-h-11 items-center self-start rounded-nav md:absolute md:top-6.5 md:left-15 md:mt-0 md:min-h-0"
      >
        <BrandMark variant="mobile" className="md:hidden" />
        <BrandMark variant="header" className="hidden md:flex" />
      </Link>

      <main className="relative z-7 my-auto w-full md:my-0 md:w-104">
        {/* Google sign-in is built (lib/actions/auth.ts → signInWithGoogle) and
            ships once the provider is configured in Supabase. */}
        <LoginForm next={next} urlError={error} />
      </main>

      <CenteredAttributions className="relative z-7" />
    </div>
  );
}
