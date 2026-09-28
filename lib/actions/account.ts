"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { savePasswordErrorMessage } from "@/lib/auth/password";
import { savePassword } from "@/lib/auth/save-password";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, otpCodeSchema, passwordSchema } from "@/lib/validators";

export type AccountActionResult = { ok: true } | { ok: false; message: string };

const SESSION_ENDED = { ok: false, message: "Your session ended. Sign in again." } as const satisfies AccountActionResult;

/** Signed-in user id, re-checked inside every action (proxy.ts is not the boundary). */
async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/**
 * Starts an email change (SPEC §8.10). With Supabase's secure email change,
 * both the old and the new address get a link, and both must be clicked.
 */
export async function changeEmail(email: string): Promise<AccountActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check that address." };

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data } = await supabase.auth.getUser();
  if (data.user?.email?.toLowerCase() === parsed.data.toLowerCase()) {
    return { ok: false, message: "That's already your email." };
  }

  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent("/settings/account")}` },
  );
  if (error?.code === "email_exists") return { ok: false, message: "That address already has a Marquee account." };
  if (error?.code === "over_email_send_rate_limit") return { ok: false, message: "Too many emails just now. Try again in a minute." };
  if (error) return { ok: false, message: "Couldn't start the change. Try again." };

  revalidatePath("/settings/account");
  return { ok: true };
}

export type PasswordActionResult =
  | { ok: true }
  /** Supabase wants proof first: a code is on its way to the account's email. */
  | { ok: false; confirm: true; message?: string }
  | { ok: false; confirm?: false; message: string };

/**
 * Sets or changes the password from Settings → Account (SPEC §8.10). With
 * Supabase's secure password change on and a session over a day old, the
 * first try emails a code; the second carries it as `nonce`.
 */
export async function setPassword(password: string, nonce?: string): Promise<PasswordActionResult> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your password." };
  const code = nonce === undefined ? null : otpCodeSchema.safeParse(nonce);
  if (code && !code.success) return { ok: false, confirm: true, message: "Enter all 6 digits." };

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const error = await savePassword(supabase, parsed.data, code?.data);
  if (error?.code === "reauthentication_needed" || error?.code === "reauth_nonce_missing") {
    const sent = await supabase.auth.reauthenticate();
    if (sent.error) return { ok: false, message: savePasswordErrorMessage(sent.error) };
    return { ok: false, confirm: true };
  }
  if (error?.code === "reauthentication_not_valid") {
    return { ok: false, confirm: true, message: savePasswordErrorMessage(error) };
  }
  if (error) return { ok: false, message: savePasswordErrorMessage(error) };

  revalidatePath("/settings/account");
  return { ok: true };
}

/**
 * Deletes the account for good (SPEC §5, §8.10): photos first, since nobody can
 * clear the folder once the user is gone, then the delete_account() RPC, which
 * cascades to the profile, categories and items. Ends on the landing page.
 */
export async function deleteAccount(confirmation: string): Promise<AccountActionResult> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  if (!profile || confirmation.trim() !== profile.username) {
    return { ok: false, message: "Type your username exactly to confirm." };
  }

  const bucket = supabase.storage.from("avatars");
  const { data: files, error: listError } = await bucket.list(userId, { limit: 1000 });
  if (listError) return { ok: false, message: "Couldn't clear your photo. Nothing was deleted; try again." };
  if (files.length > 0) {
    const { error: removeError } = await bucket.remove(files.map((file) => `${userId}/${file.name}`));
    if (removeError) return { ok: false, message: "Couldn't clear your photo. Nothing was deleted; try again." };
  }

  const { error } = await supabase.rpc("delete_account");
  if (error) return { ok: false, message: "Couldn't delete your account. Try again." };

  // The user no longer exists server-side; just drop the session cookies.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?goodbye=1");
}
