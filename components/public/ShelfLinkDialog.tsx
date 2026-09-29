"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/Button";
import { siteUrl } from "@/lib/site";
import { useCloseWatcher } from "@/lib/use-close-watcher";
import { useReturnFocus } from "@/lib/use-return-focus";
import { ShareLink } from "./ShareLink";

type ShelfLinkDialogProps = {
  open: boolean;
  onClose: () => void;
  shelfName: string;
  token: string | null;
  busy: boolean;
  onCreate: () => void;
  /** Both ask first: the old link stops working. */
  onRenew: () => void;
  onRemove: () => void;
};

export const shelfLinkUrl = (token: string) => `${siteUrl()}/s/${token}`;

/** Sharing one shelf by its secret link (SPEC §19): make it, pass it on, replace it, or turn it off. */
export function ShelfLinkDialog({ open, onClose, shelfName, token, busy, onCreate, onRenew, onRemove }: ShelfLinkDialogProps) {
  useCloseWatcher(open, onClose);
  const returnFocus = useReturnFocus();
  const url = token ? shelfLinkUrl(token) : null;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim-motion fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[3px]" />
        <Dialog.Content
          onOpenAutoFocus={returnFocus.remember}
          onCloseAutoFocus={returnFocus.restore}
          className="panel-motion fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-120 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-tile border border-white/10 bg-sheet shadow-modal"
        >
          <div className="flex flex-col gap-4 px-5.5 pt-5 pb-5">
            <div>
              <Dialog.Title className="font-display text-28 leading-[1.1] text-balance wrap-break-word">Share {shelfName} by link</Dialog.Title>
              <Dialog.Description className="mt-3 text-13 leading-[1.6] text-text-muted">
                Anyone with the link sees this shelf and nothing else of yours, even with your profile private. Never your
                notes or dates.
              </Dialog.Description>
            </div>
            {url && token ? (
              <div className="flex flex-col gap-2.5 rounded-card border border-accent/20 bg-accent/6 p-3">
                <p className="truncate font-mono text-12 text-text select-all">{url}</p>
                <div className="flex gap-2">
                  <ShareLink url={url} title={`${shelfName} on Marquee`} className="flex-1 md:flex-none" />
                  <Button asChild variant="ghost" className="h-11 px-3.5 text-13 md:h-9">
                    <Link href={`/s/${token}`}>
                      View
                      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.8} />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={onCreate} disabled={busy} aria-busy={busy} className="h-11 self-start px-4.5 text-13 shadow-cta-sm md:h-9.5">
                {busy ? "Making it" : "Create link"}
              </Button>
            )}
          </div>
          {token && (
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border bg-bg/40 px-5.5 py-3.5">
              <Button variant="ghost" onClick={onRemove} disabled={busy} className="mr-auto h-11 px-3 text-13 text-dropped hover:text-dropped md:h-9.5">
                Turn off
              </Button>
              <Button variant="secondary" onClick={onRenew} disabled={busy} className="h-11 px-4 text-13 md:h-9.5">
                New link
              </Button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
