"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AuthCard } from "./AuthCard";
import { CodeForm } from "./CodeForm";

const RESEND_COOLDOWN_SECONDS = 60;

type CheckInboxProps = {
  email: string;
  next: string;
  /** Server time the code went out. */
  sentAt: number;
  formAction: (formData: FormData) => void;
  pending: boolean;
  onDifferentEmail: () => void;
};

/**
 * After the code is sent (SPEC §8.2). Remounts on every send, which clears the
 * code boxes and restarts the resend cooldown.
 */
export function CheckInbox({
  email,
  next,
  sentAt,
  formAction,
  pending,
  onDifferentEmail,
}: CheckInboxProps) {
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const coolingDown = secondsLeft > 0;
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <AuthCard className="px-5.5 pt-7 pb-6 text-center md:p-8">
      <div aria-live="polite">
        <span
          aria-hidden
          className="mx-auto flex size-10.5 items-center justify-center rounded-xl border border-completed/30 bg-completed/12 text-completed md:size-11"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <polyline points="3.5 7 12 13.5 20.5 7" />
          </svg>
        </span>
        <h1 className="font-display opsz-120 mt-4.5 text-[30px] leading-[1.1] md:mt-5 md:text-[34px]">
          Check your <em className="text-accent">inbox.</em>
        </h1>
        <p className="mt-2.75 text-13 leading-[1.55] text-text-muted md:mt-3 md:text-[13.5px]">
          We sent a 6-digit code to{" "}
          <span className="font-mono text-[12.5px] break-all text-text md:text-13">{email}</span>. It
          expires in 15 minutes.
        </p>
      </div>

      <CodeForm email={email} next={next} sentAt={sentAt} />

      <div className="mt-5 flex gap-2.25 md:gap-2.5">
        <form action={formAction} className="flex-1">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            disabled={coolingDown || pending}
            className={cn(
              "min-h-11 w-full rounded-card border bg-surface py-2.75 transition-colors",
              coolingDown
                ? "cursor-not-allowed border-white/6 font-mono text-[12.5px] text-text-faint md:text-13"
                : "border-white/8 text-13 text-text-muted hover:text-text disabled:cursor-wait md:text-[13.5px]",
            )}
          >
            {pending ? "Sending…" : coolingDown ? `Resend in ${countdown}` : "Resend code"}
          </button>
        </form>
        <button
          type="button"
          onClick={onDifferentEmail}
          className="min-h-11 flex-1 rounded-card border border-white/8 bg-surface py-2.75 text-13 text-text-muted transition-colors hover:text-text md:text-[13.5px]"
        >
          Different email
        </button>
      </div>

      <p className="mt-4 text-[11.5px] text-text-muted md:mt-4.5">
        Nothing after a minute? It&apos;s probably sulking in spam.
      </p>
    </AuthCard>
  );
}
