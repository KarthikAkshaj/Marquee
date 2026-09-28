"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signInWithEmail, signInWithPassword, type AuthActionState } from "@/lib/actions/auth";
import { captchaEnabled } from "@/lib/captcha";
import { cn } from "@/lib/utils";
import { emailSchema, passwordSchema } from "@/lib/validators";
import { AuthCard } from "./AuthCard";
import { CaptchaNotice } from "./CaptchaNotice";
import { CheckInbox } from "./CheckInbox";
import { GoogleOr } from "./GoogleOr";
import { choosesPassword, LOGIN_MODES, type LoginMode } from "./loginModes";
import { LoginHeading } from "./LoginHeading";
import { ForgotLink, ModeLinks } from "./ModeLinks";
import { PasswordField } from "./PasswordField";
import { SignedInStamp } from "./SignedInStamp";
import { captchaFailureMessage, useCaptcha } from "./useCaptcha";

const initialState: AuthActionState = { status: "idle" };

type LoginFormProps = {
  next: string;
  /** Set when a sign-in attempt bounced back with `?error=`. */
  urlError: string | null;
  /** Google only shows once it is switched on in Supabase. */
  googleEnabled: boolean;
  /** "password" when this browser signed in with one last time. */
  initialMode?: LoginMode;
};

export function LoginForm({ next, urlError, googleEnabled, initialMode = "code" }: LoginFormProps) {
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState("");
  // A new password waits here while its code is on the way (loginModes.ts).
  const [password, setPassword] = useState("");
  // "Different email" hides the inbox view without losing what was typed.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  // Switching forms puts the last one's error away.
  const [putAway, setPutAway] = useState<AuthActionState | null>(null);
  const { mount: captchaMount, getToken: getCaptchaToken } = useCaptcha();
  const router = useRouter();

  /**
   * Every submit goes through here, including the resend on the next screen.
   * The robot check runs inside the action rather than ahead of it: React treats
   * one submission as a single transition, so waiting here is what keeps the
   * button busy for the second or two Cloudflare takes, and stops a second click.
   */
  async function submit(previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
    try {
      const token = await getCaptchaToken();
      if (token) formData.set("captchaToken", token);
    } catch (error) {
      return { status: "error", message: captchaFailureMessage(error) };
    }
    if (formData.get("mode") === "password") return signInWithPassword(previous, formData);
    // Everything else emails a code. A password being chosen stays on this page until the code is typed.
    formData.delete("password");
    return signInWithEmail(previous, formData);
  }

  const [state, formAction, pending] = useActionState(submit, initialState);
  const signedIn = state.status === "signed-in" ? state.next : null;

  useEffect(() => {
    if (signedIn) router.replace(signedIn);
  }, [signedIn, router]);

  const copy = LOGIN_MODES[mode];
  const isNew = choosesPassword(mode);
  const emailValid = emailSchema.safeParse(email).success;
  const passwordReady = isNew ? passwordSchema.safeParse(password).success : password.length > 0;
  const ready = emailValid && (mode === "code" || passwordReady);
  const error = state.status === "error" && state !== putAway ? state.message : null;
  const showInbox = state.status === "sent" && state.sentAt !== dismissedAt;
  const busy = pending || signedIn !== null;
  // Google is a way in, not a way back to a password.
  const withGoogle = googleEnabled && mode !== "reset";

  function switchMode(to: LoginMode) {
    setMode(to);
    setPassword("");
    setPutAway(state);
  }

  // The captcha div sits below whichever screen is showing, never inside one, so
  // that moving to the code screen doesn't pull the widget out of the page and
  // leave the resend with nothing to run.
  const captcha = <div ref={captchaMount} className="flex justify-center" />;

  if (showInbox) {
    return (
      <>
        <CheckInbox
          key={state.sentAt}
          email={state.email}
          next={next}
          sentAt={state.sentAt}
          newPassword={isNew ? password : undefined}
          formAction={formAction}
          pending={pending}
          onDifferentEmail={() => setDismissedAt(state.sentAt)}
        />
        {captcha}
      </>
    );
  }

  return (
    <>
      <AuthCard className="px-5.5 pt-6.5 pb-5.5 md:px-8 md:pt-8 md:pb-7">
        <LoginHeading mode={mode} urlError={urlError} />

        {withGoogle && <GoogleOr next={next} />}

        <form action={formAction} className={withGoogle ? undefined : "mt-6"} noValidate>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value={mode} />
          <label htmlFor="email" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete={mode === "code" ? "email" : "username"}
            inputMode="email"
            placeholder="you@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            readOnly={signedIn !== null}
            aria-invalid={error !== null}
            aria-describedby={error ? "email-error" : mode === "code" && !emailValid ? "email-hint" : undefined}
            required
          />
          {copy.passwordLabel && (
            <PasswordField
              key={isNew ? "new" : "current"}
              label={copy.passwordLabel}
              value={password}
              onChange={setPassword}
              isNew={isNew}
              invalid={error !== null && mode === "password"}
              describedBy={error ? "email-error" : undefined}
              readOnly={signedIn !== null}
              aside={mode === "password" && <ForgotLink onClick={() => switchMode("reset")} />}
            />
          )}
          {error && (
            <p id="email-error" role="alert" className="mt-2 text-13 text-pretty text-dropped">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={!ready || busy}
            aria-busy={busy}
            className={cn("h-auto w-full py-3.25 text-14 shadow-cta-sm", mode === "code" ? "mt-2.5" : "mt-4")}
          >
            {pending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
            {signedIn ? "You're in" : pending ? copy.busy : copy.submit}
          </Button>
          {mode === "code" && !emailValid && (
            <p id="email-hint" className="mt-2.25 text-center text-[11px] text-text-muted">
              Enter an email and this wakes up.
            </p>
          )}
          <ModeLinks mode={mode} onSwitch={switchMode} disabled={busy} />
          {signedIn && <SignedInStamp />}
        </form>
        {captchaEnabled() && <CaptchaNotice />}
      </AuthCard>
      {captcha}
    </>
  );
}
