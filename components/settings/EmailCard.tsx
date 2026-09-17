"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { changeEmail } from "@/lib/actions/account";
import { signOut, switchAccount } from "@/lib/actions/auth";
import type { Account } from "@/lib/queries";

type EmailCardProps = Pick<Account, "email" | "pendingEmail" | "signsInWith"> & {
  /** From ?notice= after the first of the two confirmation links. */
  halfConfirmed: boolean;
};

function methodLabel({ google, email }: Account["signsInWith"]) {
  if (google && email) return "Signs in with Google or an email code";
  return google ? "Signed in with Google" : "Signed in with an email code";
}

/** Email, sign-in method, Change email, Switch account and Sign out (SPEC §8.10, handoff §07). */
export function EmailCard({ email, pendingEmail, signsInWith, halfConfirmed }: EmailCardProps) {
  const [changing, setChanging] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [leaving, startLeaving] = useTransition();
  const waitingOn = sentTo ?? pendingEmail;

  function submit(event: FormEvent) {
    event.preventDefault();
    startSending(async () => {
      const result = await changeEmail(draft);
      if (!result.ok) return setError(result.message);
      setError(null);
      setSentTo(draft.trim());
      setChanging(false);
    });
  }

  return (
    <section aria-labelledby="account-email" className="rounded-[11px] border border-border bg-surface p-4.5 surface-highlight md:p-5">
      <p id="account-email" className="label-mono tracking-[.12em] text-text-muted">
        Email
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-0 text-16 break-all">{email}</p>
        <span className="flex items-center gap-1.75 rounded-full border border-white/10 bg-white/5 px-2.75 py-1 text-[11.5px]">
          <span aria-hidden className="size-1.5 rounded-full bg-completed" />
          {methodLabel(signsInWith)}
        </span>
      </div>

      {signsInWith.email ? (
        waitingOn ? (
          <p role="status" className="mt-2.25 text-12 text-pretty text-accent">
            {halfConfirmed
              ? "One down. Now click the link we sent to the other address."
              : `Almost there: we sent confirmation links to ${email} and ${waitingOn}. Click both to switch.`}
          </p>
        ) : (
          <p className="mt-2.25 text-12 text-text-muted">Sign-in codes land here.</p>
        )
      ) : (
        <p className="mt-2.25 text-12 text-text-muted">Change it with your Google account; we only ever see the address.</p>
      )}

      {changing && (
        <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-2.5 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            <label htmlFor="new-email" className="sr-only">
              New email
            </label>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="new@email.com"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "new-email-error" : undefined}
              className="h-11 py-0"
            />
            {error && (
              <p id="new-email-error" role="alert" className="mt-1.75 text-12 text-dropped">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={sending || !draft.trim()} aria-busy={sending} className="h-11 flex-1 px-4 text-13 md:h-11 md:flex-none">
              {sending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
              {sending ? "Sending…" : "Send links"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setChanging(false)} className="h-11 px-3.5 text-13">
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="mt-4.5 flex flex-wrap items-center gap-2.5">
        {signsInWith.email && !changing && (
          <Button variant="secondary" onClick={() => setChanging(true)} className="h-11 px-4 text-13 md:h-10">
            Change email
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={leaving}
          onClick={() => startLeaving(() => switchAccount())}
          className="h-11 px-4 text-13 md:h-10"
        >
          Switch account
        </Button>
        <Button
          variant="ghost"
          disabled={leaving}
          onClick={() => startLeaving(() => signOut())}
          className="h-11 px-4 text-13 text-dropped-muted hover:text-dropped md:h-10"
        >
          Sign out
        </Button>
      </div>
    </section>
  );
}
