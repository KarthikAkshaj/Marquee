"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { setProfilePublic, setShelfPublic } from "@/lib/actions/profile";
import { categoryStyle } from "@/lib/categories";
import type { Sharing } from "@/lib/queries";
import { cn } from "@/lib/utils";

type SharingCardProps = Sharing & {
  /** The full address to copy, from the site URL. */
  link: string | null;
};

/**
 * Settings → Profile's "Share your shelves" (SPEC §19): the main switch for
 * the public page, then one per shelf. Everything starts off. Each switch
 * flips at once and flips back if the save fails.
 */
export function SharingCard({ username, isPublic, shelves, link }: SharingCardProps) {
  const [on, setOn] = useState(isPublic);
  const [shared, setShared] = useState(() => new Set(shelves.filter((shelf) => shelf.is_public).map((shelf) => shelf.id)));
  const [copied, setCopied] = useState(false);
  const [, startSaving] = useTransition();

  function flipProfile(next: boolean) {
    setOn(next);
    startSaving(async () => {
      const result = await setProfilePublic(next);
      if (result.ok) return;
      setOn(!next);
      toast.error(result.message);
    });
  }

  function flipShelf(id: string, next: boolean) {
    const toggle = (value: boolean) =>
      setShared((current) => {
        const updated = new Set(current);
        if (value) updated.add(id);
        else updated.delete(id);
        return updated;
      });
    toggle(next);
    startSaving(async () => {
      const result = await setShelfPublic(id, next);
      if (result.ok) return;
      toggle(!next);
      toast.error(result.message);
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy. The link is right there to select.");
    }
  }

  return (
    <section id="sharing" aria-labelledby="sharing-title" className="scroll-mt-24 rounded-[11px] border border-border bg-surface p-4.5 surface-highlight md:p-5">
      <h2 id="sharing-title" className="label-mono tracking-[.12em] text-text-muted">
        Share your shelves
      </h2>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p id="sharing-main" className="text-16">
            Public profile
          </p>
          <p className="mt-1.25 text-12 text-pretty text-text-muted">
            {on
              ? "Anyone with the link sees the shelves switched on below. Never your notes or dates."
              : "Off, so nobody sees a thing. Switch it on, then pick shelves."}
          </p>
        </div>
        <Switch checked={on} onCheckedChange={flipProfile} aria-labelledby="sharing-main" className="mt-0.5" />
      </div>

      {on && username && link && (
        <div className="mt-4 flex animate-rise flex-col gap-2.5 rounded-card border border-accent/20 bg-accent/6 p-3 lite:animate-none md:flex-row md:items-center">
          <p className="min-w-0 flex-1 truncate font-mono text-12 text-text select-all">{link}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={copy} className="h-11 flex-1 px-3.5 text-13 md:h-9 md:flex-none">
              {copied ? (
                <Check aria-hidden className="size-4 animate-pop-spring text-completed lite:animate-none" strokeWidth={2.2} />
              ) : (
                <Copy aria-hidden className="size-4" strokeWidth={1.8} />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button asChild variant="ghost" className="h-11 px-3.5 text-13 md:h-9">
              <Link href={`/u/${username}`}>
                View
                <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.8} />
              </Link>
            </Button>
          </div>
        </div>
      )}

      <ul aria-label="Shelves to share" className={cn("mt-4 flex flex-col border-t border-border pt-1.5 transition-opacity", !on && "opacity-60")}>
        {shelves.map((shelf) => {
          const style = categoryStyle(shelf.color);
          const lit = shared.has(shelf.id);
          return (
            <li key={shelf.id}>
              <label className="relative isolate flex min-h-13 cursor-pointer items-center gap-3 rounded-card px-2 md:min-h-11">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-0 -z-10 rounded-[inherit] bg-linear-to-r to-transparent to-70% transition-opacity duration-300 ease-cinematic",
                    style.wash,
                    lit ? "opacity-100" : "opacity-0",
                  )}
                />
                <CategoryIcon name={shelf.icon} className={cn("size-4.25 transition-colors", lit ? style.text : "text-text-muted")} />
                <span className="min-w-0 flex-1 truncate text-14">{shelf.name}</span>
                <span className="font-mono text-[11px] text-text-muted">
                  {shelf.itemCount}
                  <span className="sr-only"> titles</span>
                </span>
                <Switch checked={lit} onCheckedChange={(next) => flipShelf(shelf.id, next)} />
              </label>
            </li>
          );
        })}
      </ul>
      {!on && shared.size > 0 && (
        <p className="mt-2 text-12 text-text-muted">Your picks are kept. They show again when the profile is on.</p>
      )}
    </section>
  );
}
