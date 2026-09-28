"use client";

import { BrandMark } from "@/components/shell/BrandMark";
import { CountValue } from "@/components/ui/CountValue";
import { Avatar } from "@/components/user/Avatar";
import type { Profile } from "@/lib/queries";
import { PassStub } from "./PassStub";
import { usePassTilt } from "./usePassTilt";

type MemberPassProps = {
  /** As typed so far, so the pass shows how you'll look before you save. */
  name: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
  stats: Profile["stats"];
};

/**
 * Settings → Profile's member pass (U31): a cinema membership card with your
 * photo, name, @username, bio and numbers, in gold foil that catches the
 * light as the mouse moves over it. It follows the form as you type.
 */
export function MemberPass({ name, username, bio, avatarUrl, stats }: MemberPassProps) {
  const { frame, pass } = usePassTilt<HTMLElement, HTMLDivElement>();
  const shown = name || username;

  return (
    <section ref={frame} aria-label="Member pass" className="relative animate-rise">
      <div aria-hidden className="glow-amber pointer-events-none absolute inset-x-6 -top-6 -bottom-8 opacity-50 blur-2xl" />
      <div
        ref={pass}
        className="ticket-notch tilt relative overflow-hidden rounded-[18px] border border-white/10 bg-linear-150 from-elevated via-surface to-sheet transition-transform duration-500 ease-cinematic [--stub:88px] md:[--stub:156px]"
      >
        <div aria-hidden className="guilloche pointer-events-none absolute inset-0" />
        <div aria-hidden className="glow-amber pointer-events-none absolute -top-28 -left-20 size-80 opacity-40" />
        <div aria-hidden className="grain-fine pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light" />
        <div aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[13px] border border-accent/14" />

        <div className="relative grid md:grid-cols-[minmax(0,1fr)_156px]">
          <div className="flex min-w-0 flex-col gap-4.5 px-5 pt-5 pb-5.5 md:gap-5 md:px-6.5 md:pt-6 md:pb-6.5">
            <div className="flex items-center justify-between gap-3">
              <BrandMark variant="mockup" />
              <span className="label-mono text-[9.5px] tracking-[.2em] text-accent/85">Member pass</span>
            </div>

            <div className="flex min-w-0 items-center gap-4 md:gap-5">
              <span className="shrink-0 rounded-full bg-linear-135 from-accent-bright via-accent to-avatar-deep p-[2.5px] shadow-mark-card">
                <span className="block rounded-full bg-sheet p-[2px]">
                  <Avatar name={shown} src={avatarUrl} size="pass" />
                </span>
              </span>
              <div className="min-w-0">
                <p className="font-display opsz-120 truncate text-[30px] leading-[1.05] md:text-[36px]">{shown}</p>
                <p className="mt-1.25 truncate font-mono text-[12.5px] text-text-muted">@{username}</p>
                {bio && <p className="mt-2 line-clamp-2 max-w-100 text-[12.5px] leading-[1.5] text-pretty text-text/80">{bio}</p>}
              </div>
            </div>

            <dl className="flex items-end gap-6 md:gap-8">
              {/* Label first for the list, number first for the eye. */}
              <div className="flex flex-col-reverse">
                <dt className="label-mono mt-1.5 text-[9px] tracking-[.16em] text-text-muted">Titles</dt>
                <dd className="font-mono text-[22px] leading-none tracking-[-.02em] md:text-[26px]">
                  <CountValue value={stats.totalTitles} delayMs={250} />
                </dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="label-mono mt-1.5 text-[9px] tracking-[.16em] text-text-muted">Finished this year</dt>
                <dd className="font-mono text-[22px] leading-none tracking-[-.02em] text-completed md:text-[26px]">
                  <CountValue value={stats.completedThisYear} delayMs={380} />
                </dd>
              </div>
            </dl>
          </div>

          <PassStub memberSince={stats.memberSince} username={username} />
        </div>

        <div aria-hidden className="foil" />
        <div aria-hidden className="glare pointer-events-none absolute inset-0 opacity-70" />
      </div>
    </section>
  );
}
