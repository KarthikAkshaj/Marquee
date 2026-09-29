"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { StatusTab } from "@/lib/items";
import type { PublicTitle, ShelfAccess, ViewerCopy, ViewerShelf } from "@/lib/public-profile";
import type { CategoryKind } from "@/lib/status";
import { AddAllDialog } from "./AddAllDialog";

type AddAllButtonProps = {
  access: ShelfAccess;
  kind: CategoryKind;
  /** What's on the open tab. */
  shown: PublicTitle[];
  tab: StatusTab;
  /** Your copies, by the shared title's id. */
  copies: Readonly<Record<string, ViewerCopy>>;
  /** Signed out: where signing in starts, coming back here. */
  signInHref: string | null;
  /** Your shelves of that kind. */
  shelves: ViewerShelf[];
  from: string;
  onAdded: (copies: Record<string, ViewerCopy>) => void;
  onUndone: (sharedIds: string[]) => void;
};

/** "Add all 42" above a shared shelf's posters (SPEC §19): the tab you're on, less what's yours already. */
export function AddAllButton({ access, kind, shown, tab, copies, signInHref, shelves, from, onAdded, onUndone }: AddAllButtonProps) {
  const [open, setOpen] = useState(false);
  const missing = shown.filter((title) => !copies[title.id]);
  const label = `${tab === "all" ? "Add all" : "Add these"} ${missing.length.toLocaleString("en")}`;
  const button = "h-11 gap-1.5 self-end px-4 text-13 md:h-9";

  if (shown.length === 0) return null;
  if (signInHref) {
    return (
      <Button asChild variant="secondary" className={button}>
        <Link href={signInHref}>
          <Plus aria-hidden className="size-3.5" strokeWidth={2.2} />
          {label}
        </Link>
      </Button>
    );
  }
  // No shelf of that kind: each title's card says how to make one.
  if (shelves.length === 0) return null;
  if (missing.length === 0) {
    return (
      <p className="flex min-h-11 items-center gap-2 self-end text-13 text-text-muted md:min-h-9">
        <Check aria-hidden className="size-4 text-completed" strokeWidth={2.2} />
        {tab === "all" ? "All on your shelves" : "These are all on your shelves"}
      </p>
    );
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className={button}>
        <Plus aria-hidden className="size-3.5" strokeWidth={2.2} />
        {label}
      </Button>
      {/* Stays mounted, so closing plays its exit and the picks are kept for next time. */}
      <AddAllDialog
        open={open}
        onClose={() => setOpen(false)}
        access={access}
        kind={kind}
        titles={missing}
        yours={shown.length - missing.length}
        shelves={shelves}
        from={from}
        onAdded={onAdded}
        onUndone={onUndone}
      />
    </>
  );
}
