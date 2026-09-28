"use client";

import { Check, Copy, Share } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type ShareLinkProps = {
  url: string;
  /** What the share sheet calls it: "Flux on Marquee". */
  title: string;
  className?: string;
};

const never = () => () => {};

/** Phones and tablets get the share sheet; a mouse gets a plain copy, which is what people want there. */
function sharesNatively(url: string) {
  return (
    typeof navigator.share === "function" &&
    window.matchMedia?.("(pointer: coarse)").matches === true &&
    (navigator.canShare?.({ url }) ?? true)
  );
}

/**
 * Hands a public profile link on (SPEC §19): the phone's own share sheet
 * (WhatsApp, Instagram, Messages...) where there is one, otherwise a copy
 * with a tick to say it worked.
 */
export function ShareLink({ url, title, className }: ShareLinkProps) {
  // Decided after hydration, so the server and the first paint agree.
  const native = useSyncExternalStore(never, () => sharesNatively(url), () => false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy. The link is right there to select.");
    }
  }

  async function share() {
    if (!native) return copy();
    try {
      await navigator.share({ title, url });
    } catch (error) {
      // Closing the sheet isn't a failure; anything else falls back to a copy.
      if (!(error instanceof DOMException && error.name === "AbortError")) await copy();
    }
  }

  const Icon = copied ? Check : native ? Share : Copy;
  return (
    <Button variant="secondary" onClick={share} className={cn("h-11 px-3.5 text-13 md:h-9", className)}>
      <Icon
        aria-hidden
        className={cn("size-4", copied && "animate-pop-spring text-completed lite:animate-none")}
        strokeWidth={copied ? 2.2 : 1.8}
      />
      {copied ? "Copied" : native ? "Share" : "Copy link"}
    </Button>
  );
}
