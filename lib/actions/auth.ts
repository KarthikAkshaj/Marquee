"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { otpErrorMessage } from "@/lib/auth/otp";
import {
  PASSWORD_NOT_SAVED,
  SIGN_IN_METHOD_COOKIE,
  SIGN_IN_METHOD_MAX_AGE,
  signInErrorMessage,
} from "@/lib/auth/password";
import { savePassword } from "@/lib/auth/save-password";
import { signInCallback } from "@/lib/auth/welcome";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import {
  passwordSchema,
  safeRedirectPath,
  signInWithEmailSchema,
  signInWithPasswordSchema,
  verifyEmailCodeSchema,
} from "@/lib/validators";

export type AuthActionState =
  | { status: "idle" }
  | { status: "sent"; email: string; sentAt: number }
  /** Signed in by password: the page stamps the ticket and moves on to `next` itself. */
  | { status: "signed-in"; next: string }
  | { status: "error"; message: string };

export type VerifyCodeState =
  | { status: "idle" }
  /** `attempt` changes on every failure so the code boxes can reset. */
  | { status: "error"; message: string; attempt: number }
  /** Signed in: the page stamps the ticket and moves on to `next` itself. */
  | { status: "verified"; next: string };

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
      emailRedirectTo: signInCallback(siteUrl(), next),
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

/**
 * Email and password (SPEC §6). Supabase answers a wrong password and an
 * unknown email the same way, and so does the page.
 */
export async function signInWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInWithPasswordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your email and password." };
  }

  const next = safeRedirectPath(formData.get("next")?.toString());
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: { captchaToken: formData.get("captchaToken")?.toString() || undefined },
  });

  if (error) return { status: "error", message: signInErrorMessage(error) };

  await rememberSignInMethod(true);
  return { status: "signed-in", next };
}

/** The login page opens on the password form for people who used one last time. */
async function rememberSignInMethod(password: boolean) {
  const store = await cookies();
  if (!password) {
    store.delete(SIGN_IN_METHOD_COOKIE);
    return;
  }
  store.set(SIGN_IN_METHOD_COOKIE, "password", {
    maxAge: SIGN_IN_METHOD_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: siteUrl().startsWith("https:"),
  });
}

/**
 * Checks the 6-digit code and signs the user in (SPEC §6, §8.2). A `password`
 * alongside makes it a sign-up or a reset: the code proves the address, then
 * the password is saved on the fresh session. Sign-up is the same whether the
 * email is new or not, so the page never reveals who has an account.
 */
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

  // Checked before the code is spent, so a bad password costs nothing.
  const typed = formData.get("password");
  const password = typeof typed === "string" && typed !== "" ? passwordSchema.safeParse(typed) : null;
  if (password && !password.success) {
    return { status: "error", message: password.error.issues[0]?.message ?? "Check your password.", attempt };
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

  if (password) {
    // They're in either way; a password that didn't take is retried from Settings.
    const failed = await savePassword(supabase, password.data);
    if (failed) console.error("[auth] password not saved after code sign-in:", failed.code ?? failed.message);
    await rememberSignInMethod(!failed);
    return { status: "verified", next: failed ? PASSWORD_NOT_SAVED : next };
  }

  await rememberSignInMethod(false);
  return { status: "verified", next };
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
      redirectTo: signInCallback(siteUrl(), next),
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
