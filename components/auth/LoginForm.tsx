"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { captchaEnabled } from "@/lib/captcha";
import { BrandMark } from "@/components/shell/BrandMark";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signInWithEmail, type AuthActionState } from "@/lib/actions/auth";
import { emailSchema } from "@/lib/validators";
import { AuthCard } from "./AuthCard";
import { CaptchaNotice } from "./CaptchaNotice";
import { CheckInbox } from "./CheckInbox";
import { GoogleButton } from "./GoogleButton";
import { useCaptcha } from "./useCaptcha";

const initialState: AuthActionState = { status: "idle" };

type LoginFormProps = {
  next: string;
  /** Set when a sign-in attempt bounced back with `?error=`. */
  urlError: string | null;
  /** Google only shows once it is switched on in Supabase. */
  googleEnabled: boolean;
};

export function LoginForm({ next, urlError, googleEnabled }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(signInWithEmail, initialState);
  const [email, setEmail] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  /** True while the robot check runs, before the action itself starts. */
  const [checking, setChecking] = useState(false);
  const { mount: captchaMount, getToken: getCaptchaToken } = useCaptcha();

  /** Every send goes through here, including the resend on the next screen. */
  async function sendCode(formData: FormData) {
    setCaptchaError(null);
    // The robot check takes a second or two of its own before the action starts,
    // and a button that looks idle through it invites a second click.
    setChecking(true);
    try {
      const token = await getCaptchaToken();
      if (token) formData.set("captchaToken", token);
    } catch (error) {
      // The message stays vague for the visitor; the reason is for whoever is fixing it.
      if (process.env.NODE_ENV !== "production") console.error("[captcha]", error);
      setCaptchaError("The robot check didn't load. Refresh the page and try again.");
      return;
    } finally {
      setChecking(false);
    }
    formAction(formData);
  }
  // "Different email" hides the inbox view without losing what was typed.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const isValid = emailSchema.safeParse(email).success;
  const showInbox = state.status === "sent" && state.sentAt !== dismissedAt;
  const busy = checking || pending;

  // The captcha div sits below whichever screen is showing, never inside one, so
  // that moving to the code screen doesn't pull the widget out of the page and
  // leave the resend with nothing to run.
  const captcha = <div ref={captchaMount} />;

  if (showInbox) {
    return (
      <>
        <CheckInbox
          key={state.sentAt}
          email={state.email}
          next={next}
          sentAt={state.sentAt}
          formAction={sendCode}
          pending={busy}
          onDifferentEmail={() => setDismissedAt(state.sentAt)}
        />
        {captcha}
      </>
    );
  }

  return (
    <>
      <AuthCard className="px-5.5 pt-6.5 pb-5.5 md:px-8 md:pt-8 md:pb-7">
        <BrandMark variant="card" />
        <h1 className="font-display opsz-120 mt-4.5 text-[32px] leading-[1.05] md:mt-5.5 md:text-[38px]">
          Let&apos;s get you <em className="text-accent">in.</em>
        </h1>
        <p className="mt-2.25 text-13 leading-normal text-text-muted md:mt-2.5 md:text-[13.5px]">
          New here? This is also how you sign up.
          <span className="hidden md:inline"> Free, no card.</span>
        </p>

        {urlError && (
          <p
            role="alert"
            className="mt-5 rounded-card border border-dropped/30 bg-dropped/10 px-3.5 py-2.5 text-13 text-dropped"
          >
            {urlError}
          </p>
        )}

        {googleEnabled && (
          <>
            <GoogleButton next={next} className="mt-6" />
            <div aria-hidden className="my-4.5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="label-mono text-text-muted">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form action={sendCode} className={googleEnabled ? undefined : "mt-6"} noValidate>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="email" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={state.status === "error"}
            aria-describedby={state.status === "error" || captchaError ? "email-error" : "email-hint"}
            required
          />
          {(state.status === "error" || captchaError) && (
            <p id="email-error" role="alert" className="mt-2 text-13 text-dropped">
              {captchaError ?? (state.status === "error" ? state.message : null)}
            </p>
          )}
          <Button
            type="submit"
            disabled={!isValid || busy}
            aria-busy={busy}
            className="mt-2.5 h-auto w-full py-3.25 text-14 shadow-cta-sm"
          >
            {busy && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
            {busy ? "Sending…" : "Email me a code"}
          </Button>
          {!isValid && (
            <p id="email-hint" className="mt-2.25 text-center text-[11px] text-text-muted">
              Enter an email and this wakes up.
            </p>
          )}
        </form>
        {captchaEnabled() && <CaptchaNotice />}
      </AuthCard>
      {captcha}
    </>
  );
}
