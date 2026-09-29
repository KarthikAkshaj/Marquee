"use client";

import { Link2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createShelfLink, removeShelfLink, renewShelfLink, type ShelfLinkResult } from "@/lib/actions/links";
import { cn } from "@/lib/utils";
import { ShelfLinkDialog } from "./ShelfLinkDialog";

type ShelfLinkButtonProps = {
  categoryId: string;
  shelfName: string;
  /** The shelf's link as the page loaded it. */
  initialToken: string | null;
  /** "row": an icon on Settings' shelf rows; "inline": words on the line under a shelf's name. */
  look: "row" | "inline";
};

const LOOKS = {
  row: { base: "size-11 shrink-0 p-0 md:size-9", on: "text-accent hover:text-accent-bright", off: "text-text-muted" },
  // The negative margin lines the icon up with the name above while keeping a full-size target.
  inline: {
    base: "-mx-2 h-11 shrink-0 gap-1.5 rounded-nav px-2 text-12 md:h-7 md:text-13",
    on: "text-accent hover:text-accent-bright",
    off: "text-text-muted hover:text-text",
  },
} as const;

/**
 * Opens a shelf's link dialog (SPEC §19) and keeps the link it shows up to
 * date. Replacing or turning a link off asks first: whoever has it loses it.
 */
export function ShelfLinkButton({ categoryId, shelfName, initialToken, look }: ShelfLinkButtonProps) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(initialToken);
  // Which question, kept while the confirm plays its exit so its words don't swap mid-fade.
  const [ask, setAsk] = useState<{ what: "renew" | "remove"; open: boolean }>({ what: "renew", open: false });
  const asking = ask.open ? ask.what : null;
  const setAsking = (what: "renew" | "remove" | null) => setAsk((current) => (what ? { what, open: true } : { ...current, open: false }));
  const [busy, startSaving] = useTransition();

  function save(action: (id: string) => Promise<ShelfLinkResult>, done?: string) {
    startSaving(async () => {
      const result = await action(categoryId);
      if (!result.ok) return void toast.error(result.message);
      setToken(result.token);
      if (done) toast.success(done);
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`${token ? "Link on" : "Share by link"}: ${shelfName}`}
        title={token ? "Shared by link" : "Share by link"}
        className={cn(LOOKS[look].base, token ? LOOKS[look].on : LOOKS[look].off)}
      >
        <Link2 aria-hidden className="size-3.75" strokeWidth={1.9} />
        {look === "inline" && (token ? "Link on" : "Share")}
      </Button>
      <ShelfLinkDialog
        open={open}
        onClose={() => setOpen(false)}
        shelfName={shelfName}
        token={token}
        busy={busy}
        onCreate={() => save(createShelfLink)}
        onRenew={() => setAsking("renew")}
        onRemove={() => setAsking("remove")}
      />
      <ConfirmDialog
        open={asking !== null}
        title={ask.what === "renew" ? "Make a new link?" : "Turn the link off?"}
        description={
          ask.what === "renew"
            ? `The old link stops working, so anyone using it will need the new one for your ${shelfName}.`
            : `Anyone using it sees nothing from now on. Your ${shelfName} shelf itself stays as it is.`
        }
        cancelLabel="Keep it"
        confirmLabel={ask.what === "renew" ? "New link" : "Turn off"}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          if (ask.what === "renew") save(renewShelfLink, "New link made. The old one no longer works.");
          else save(removeShelfLink, "Link turned off.");
          setAsking(null);
        }}
      />
    </>
  );
}
