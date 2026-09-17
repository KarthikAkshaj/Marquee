"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Account } from "@/lib/queries";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

/** Red-tinted and set apart, so nobody wanders in (SPEC §8.10, handoff §07). */
export function DangerZone({ username, titleCount, categoryCount }: Pick<Account, "username" | "titleCount" | "categoryCount">) {
  const [open, setOpen] = useState(false);

  return (
    <section aria-labelledby="danger-zone" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 id="danger-zone" className="label-mono tracking-[.14em] text-dropped-muted">
          Danger zone
        </h2>
        <span aria-hidden className="h-px flex-1 bg-linear-to-r from-dropped-muted/40 to-transparent" />
      </div>
      <div className="flex flex-col gap-4 rounded-[11px] border border-dropped-muted/25 bg-dropped-muted/6 p-4.5 md:flex-row md:items-center md:gap-6 md:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium">Delete account</p>
          <p className="mt-1.25 text-[12.5px] leading-[1.55] text-pretty text-text-muted">
            {titleCount === 1 ? "Your 1 title" : `All ${titleCount} titles`}, every rating and every note go with it. There is no
            undo and no grace period.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          className="h-11 shrink-0 border-dropped-muted/45 bg-dropped-muted/14 px-4 text-13 font-medium text-dropped hover:border-danger hover:bg-danger hover:text-danger-ink md:h-10"
        >
          Delete account
        </Button>
      </div>
      <DeleteAccountDialog
        open={open}
        onOpenChange={setOpen}
        username={username}
        titleCount={titleCount}
        categoryCount={categoryCount}
      />
    </section>
  );
}
