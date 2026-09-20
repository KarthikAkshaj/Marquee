"use server";

import { redirect } from "next/navigation";
import { otpErrorMessage } from "@/lib/auth/otp";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath, signInWithEmailSchema, verifyEmailCodeSchema } from "@/lib/validators";

export type AuthActionState =
  | { status: "idle" }
  | { status: "sent"; email: string; sentAt: number }
  | { status: "error"; message: string };

export type VerifyCodeState =
  | { status: "idle" }
  /** `attempt` changes on every failure so the code boxes can reset. */
  | { status: "error"; message: string; attempt: number };

/**
 * Emails a 6-digit sign-in code (SPEC §6). The same email carries a magic link
 * as a fallback, which lands on /auth/callback. New emails get an account.
 */
export async function signInWithEmail(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInWithEmailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your email address.",
    };
  }

  const next = safeRedirectPath(formData.get("next")?.toString());
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      // Supabase verifies this with Turnstile before it sends anything (SPEC §6).
      captchaToken: formData.get("captchaToken")?.toString() || undefined,
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    // Supabase phrases a failed captcha for developers ("request disallowed
    // (not-using-dummy-secret)"), which means nothing to whoever is signing in.
    const captcha = /captcha/i.test(error.message);
    return { status: "error", message: captcha ? "The robot check didn't pass. Refresh the page and try again." : error.message };
  }

  // Server clock, echoed back on verify, so "expired" is judged on one clock.
  return { status: "sent", email: parsed.data.email, sentAt: Date.now() };
}

/** Checks the 6-digit code and signs the user in (SPEC §6, §8.2). */
export async function verifyEmailCode(
  prev: VerifyCodeState,
  formData: FormData,
): Promise<VerifyCodeState> {
  const attempt = prev.status === "error" ? prev.attempt + 1 : 1;

  const parsed = verifyEmailCodeSchema.safeParse({
    email: formData.get("email"),
    token: formData.getAll("code").join(""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter all 6 digits.",
      attempt,
    };
  }

  const sentAt = Number(formData.get("sentAt"));
  const next = safeRedirectPath(formData.get("next")?.toString());
  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) {
    return {
      status: "error",
      message: otpErrorMessage(error, Number.isFinite(sentAt) && sentAt > 0 ? sentAt : null, Date.now()),
      attempt,
    };
  }

  redirect(next);
}

/**
 * Google OAuth (SPEC §6). The login page shows the button once the Google
 * provider is switched on in Supabase (lib/auth/providers.ts).
 * `prompt: 'select_account'` is what makes "Switch account" show the chooser
 * instead of silently reusing the last Google account.
 */
export async function signInWithGoogle(formData: FormData) {
  const next = safeRedirectPath(formData.get("next")?.toString());
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed.")}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Sign out, then send the user back to pick a different account (SPEC §6). */
export async function switchAccount() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?switch=1");
}
