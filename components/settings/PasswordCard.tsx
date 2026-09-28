"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { CodeInput } from "@/components/auth/CodeInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { setPassword } from "@/lib/actions/account";
import { OTP_LENGTH } from "@/lib/auth/otp";
import { passwordSchema } from "@/lib/validators";
import { PasswordStatus } from "./PasswordStatus";

type PasswordCardProps = {
  email: string | null;
  hasPassword: boolean;
  /** A sign-up's code worked but its password didn't save (?notice=password-not-saved). */
  notSaved: boolean;
};

/** Set or change the password (SPEC §8.10), with Supabase's emailed code when it asks for proof. */
export function PasswordCard({ email, hasPassword, notSaved }: PasswordCardProps) {
  const [open, setOpen] = useState(notSaved);
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  // A new key per failed code clears the boxes and replays the shake.
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Said once, in amber rather than as an error: nothing typed here was wrong.
  const [notice, setNotice] = useState(notSaved);
  const [saved, setSaved] = useState(false);
  const [pending, startSaving] = useTransition();
  const ready = confirming ? code.length === OTP_LENGTH : passwordSchema.safeParse(draft).success;

  function save(nonce?: string) {
    setNotice(false);
    startSaving(async () => {
      const result = await setPassword(draft, nonce);
      if (result.ok) {
        close();
        setSaved(true);
      } else if (result.confirm) {
        if (confirming) setAttempt((count) => count + 1);
        setConfirming(true);
        setCode("");
        setError(result.message ?? null);
      } else {
        setError(result.message);
      }
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready && !pending) save(confirming ? code : undefined);
  }

  function close() {
    setNotice(false);
    setOpen(false);
    setConfirming(false);
    setDraft("");
    setCode("");
    setError(null);
  }

  const has = hasPassword || saved;

  return (
    <section aria-labelledby="account-password" className="rounded-[11px] border border-border bg-surface p-4.5 surface-highlight md:p-5">
      <p id="account-password" className="label-mono tracking-[.12em] text-text-muted">
        Password
      </p>
      <PasswordStatus has={has} saved={saved} />

      {open && (
        <form onSubmit={submit} noValidate className="mt-4 animate-rise lite:animate-none">
          {confirming ? (
            <>
              <p className="text-13 text-pretty text-text-muted">
                One more step, to be sure it&apos;s you: type the code we just sent to{" "}
                <span className="font-mono text-[12.5px] break-all text-text">{email ?? "your email"}</span>.
              </p>
              <div className="mt-3 max-w-80">
                <CodeInput
                  key={attempt}
                  invalid={error !== null}
                  readOnly={pending}
                  describedBy={error ? "password-error" : undefined}
                  onChange={setCode}
                  onComplete={(value) => !pending && save(value)}
                />
              </div>
            </>
          ) : (
            <>
              <label htmlFor="new-password" className="sr-only">
                New password
              </label>
              <div className="max-w-100">
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "new-password-strength password-error" : "new-password-strength"}
                  className="h-11 py-0"
                />
                <PasswordStrength password={draft} id="new-password-strength" />
              </div>
            </>
          )}
          {notice && !error && (
            <p role="status" className="mt-2 text-12 text-accent">
              You&apos;re in, but the password didn&apos;t save. Try it here.
            </p>
          )}
          {error && (
            <p id="password-error" role="alert" className="mt-2 text-12 text-dropped">
              {error}
            </p>
          )}
          <div className="mt-3.5 flex gap-2">
            <Button type="submit" disabled={!ready || pending} aria-busy={pending} className="h-11 px-4 text-13 md:h-10">
              {pending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
              {pending ? "Saving…" : confirming ? "Confirm" : "Save password"}
            </Button>
            <Button type="button" variant="ghost" onClick={close} className="h-11 px-3.5 text-13 md:h-10">
              Cancel
            </Button>
          </div>
        </form>
      )}

      {!open && (
        <div className="mt-4.5">
          <Button
            variant="secondary"
            onClick={() => {
              setSaved(false);
              setOpen(true);
            }}
            className="h-11 px-4 text-13 md:h-10"
          >
            {has ? "Change password" : "Set a password"}
          </Button>
        </div>
      )}
    </section>
  );
}
