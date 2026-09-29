"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { signInWithGoogle } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { GoogleMark } from "./GoogleMark";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-card border border-google-stroke bg-google-fill px-4 text-14 font-medium text-google-text transition-colors hover:border-google-text/60 disabled:cursor-wait disabled:opacity-80"
    >
      {pending ? <Loader2 aria-hidden className="size-4.5 animate-spin" strokeWidth={1.5} /> : <GoogleMark />}
      Continue with Google
    </button>
  );
}

/**
 * Hands off to Google (SPEC §6). The action asks Google to show its account
 * chooser every time, which is what makes "Switch account" work.
 */
export function GoogleButton({ next, className }: { next: string; className?: string }) {
  return (
    <form action={signInWithGoogle} className={cn(className)}>
      <input type="hidden" name="next" value={next} />
      <Submit />
    </form>
  );
}
