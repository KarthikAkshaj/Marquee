"use client";

import { Loader2 } from "lucide-react";
import { AlertDialog } from "radix-ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { deleteAccount, exportData } from "@/lib/actions/account";
import { exportFileName } from "@/lib/export";
import { cn } from "@/lib/utils";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  titleCount: number;
  categoryCount: number;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The confirm gate for deleting an account (SPEC §8.10, handoff §07). */
export function DeleteAccountDialog({ open, onOpenChange, username, titleCount, categoryCount }: DeleteAccountDialogProps) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();
  const [exporting, startExporting] = useTransition();
  const ready = typed.trim() === username;

  const lines = [
    `${plural(titleCount, "title", "titles")} across ${plural(categoryCount, "category", "categories")}`,
    "Every rating, note and date you logged",
    "Your profile and photo",
    "Your username. It goes back in the pool",
  ];

  function download() {
    startExporting(async () => {
      const result = await exportData();
      if (!result.ok) return void toast.error(result.message);
      const url = URL.createObjectURL(new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFileName(username);
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Your data's downloading.");
    });
  }

  function confirm() {
    startDeleting(async () => {
      // On success the action redirects to the landing page and never returns.
      const result = await deleteAccount(typed);
      if (!result.ok) setError(result.message);
    });
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (deleting) return;
        if (!next) {
          setTyped("");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[3px]" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-109 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-tile border border-dropped-muted/30 bg-sheet shadow-modal">
          <div className="px-5.5 pt-5 pb-4">
            <AlertDialog.Title className="font-display text-28 leading-[1.1]">
              Delete your <em className="text-dropped">account?</em>
            </AlertDialog.Title>
            <AlertDialog.Description asChild>
              <ul className="mt-3.5 flex flex-col gap-2">
                {lines.map((line) => (
                  <li key={line} className="flex items-center gap-2.5 text-13 text-text-muted">
                    <span aria-hidden className="size-1.25 shrink-0 rounded-full bg-dropped-muted" />
                    {line}
                  </li>
                ))}
                <li className="sr-only">There is no undo.</li>
              </ul>
            </AlertDialog.Description>
            <p className="mt-3.5 text-[12.5px] text-text-muted">
              Want a copy first?{" "}
              <button
                type="button"
                onClick={download}
                disabled={exporting}
                className="min-h-11 text-accent transition-colors hover:text-accent-bright disabled:cursor-wait md:min-h-0"
              >
                {exporting ? "Gathering it…" : "Export my data first →"}
              </button>
            </p>
          </div>

          <div className="px-5.5 pb-4.5">
            <label htmlFor="delete-confirm" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
              Type <span className="text-text normal-case">{username}</span> to confirm
            </label>
            <input
              id="delete-confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className={cn(
                "h-11 w-full rounded-card border bg-surface px-3.5 font-mono text-14 text-text outline-none transition-colors focus-visible:shadow-input-focus",
                ready ? "border-danger" : "border-white/10 focus-visible:border-dropped-muted/50",
              )}
            />
            {error && (
              <p role="alert" className="mt-2 text-12 text-dropped">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/40 px-5.5 py-3.5">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={deleting} className="h-11 px-3.5 text-13 md:h-9.5">
                Keep my account
              </Button>
            </AlertDialog.Cancel>
            <Button
              variant="danger"
              onClick={confirm}
              disabled={!ready || deleting}
              aria-busy={deleting}
              className={cn(
                "h-11 px-4.5 text-13 md:h-9.5",
                !ready && "border-dropped-muted/22 bg-dropped-muted/10 text-dropped-muted/70 shadow-none disabled:opacity-100",
              )}
            >
              {deleting && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
              {deleting ? "Deleting…" : "Delete forever"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
