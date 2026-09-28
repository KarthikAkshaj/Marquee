import { Check } from "lucide-react";

/** The top of the password card: whether there is one, and a line about it or about the save that just landed. */
export function PasswordStatus({ has, saved }: { has: boolean; saved: boolean }) {
  return (
    <>
      <p className="mt-2.5 text-16">
        {has ? (
          <>
            <span aria-hidden className="font-mono tracking-[.18em]">
              ••••••••
            </span>
            <span className="sr-only">Set</span>
          </>
        ) : (
          "Not set yet"
        )}
      </p>
      {saved ? (
        <p role="status" className="mt-2.25 flex items-center gap-1.75 text-12 text-completed">
          <span aria-hidden className="grid size-4.5 animate-pop-spring place-items-center rounded-full bg-completed/16 lite:animate-none">
            <Check className="size-3" strokeWidth={2.6} />
          </span>
          Saved. Use it next time you sign in.
        </p>
      ) : (
        <p className="mt-2.25 text-12 text-text-muted">
          {has ? "Sign in with it and your email, on any device." : "Codes and Google work fine. A password skips the inbox."}
        </p>
      )}
    </>
  );
}
