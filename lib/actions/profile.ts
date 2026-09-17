"use server";

import { revalidatePath } from "next/cache";
import { AVATAR_TYPES, ownAvatarPath, suggestUsername } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { avatarFileSchema, profileSchema, usernameSchema, type ProfileInput } from "@/lib/validators";

export type ProfileActionResult = { ok: true } | { ok: false; message: string };
export type UsernameCheck =
  | { status: "available" }
  | { status: "taken"; suggestion: string | null }
  | { status: "invalid"; message: string }
  | { status: "unknown" };

const SESSION_ENDED = { ok: false, message: "Your session ended. Sign in again." } as const satisfies ProfileActionResult;
const TAKEN = "Someone got there first.";

/** Signed-in user id, re-checked inside every action (proxy.ts is not the boundary). */
async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function isAvailable(supabase: Client, candidate: string) {
  const { data, error } = await supabase.rpc("is_username_available", { candidate });
  return error ? null : data;
}

/**
 * Live username check (SPEC §8.10). Profiles are private under RLS, so this
 * asks a database function that only answers yes or no.
 */
export async function checkUsername(candidate: string): Promise<UsernameCheck> {
  const parsed = usernameSchema.safeParse(candidate);
  if (!parsed.success) return { status: "invalid", message: parsed.error.issues[0]?.message ?? "" };

  const { supabase, userId } = await requireUserId();
  if (!userId) return { status: "unknown" };

  const available = await isAvailable(supabase, parsed.data);
  if (available === null) return { status: "unknown" };
  if (available) return { status: "available" };

  // Offer one nearby name, but only one we've checked is free.
  const suggestion = suggestUsername(parsed.data);
  return { status: "taken", suggestion: (await isAvailable(supabase, suggestion)) ? suggestion : null };
}

export async function updateProfile(input: ProfileInput): Promise<ProfileActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details." };

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  // 23505: the username was claimed between the live check and saving.
  if (error?.code === "23505") return { ok: false, message: `${TAKEN} Pick another username.` };
  if (error) return { ok: false, message: "Couldn't save your profile. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Stores a photo the browser already cropped to 512×512 at
 * avatars/<user_id>/<timestamp>.<ext>, points the profile at it, then deletes
 * the previous upload (SPEC §8.10).
 */
export async function uploadAvatar(formData: FormData): Promise<ProfileActionResult> {
  const file = formData.get("avatar");
  if (!(file instanceof File)) return { ok: false, message: "Pick a photo first." };
  const parsed = avatarFileSchema.safeParse({ type: file.type, size: file.size });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "That photo won't work." };

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const path = `${userId}/${Date.now()}.${AVATAR_TYPES[parsed.data.type]}`;
  const bucket = supabase.storage.from("avatars");
  const { error: uploadError } = await bucket.upload(path, file, {
    contentType: parsed.data.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) return { ok: false, message: "Couldn't upload that photo. Try again." };

  const { data: before } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: bucket.getPublicUrl(path).data.publicUrl })
    .eq("id", userId);
  if (error) {
    await bucket.remove([path]);
    return { ok: false, message: "Couldn't save your photo. Try again." };
  }

  const previous = ownAvatarPath(before?.avatar_url, userId);
  if (previous) await bucket.remove([previous]);

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Back to initials. Deletes the file too, unless it was a Google photo we never stored. */
export async function removeAvatar(): Promise<ProfileActionResult> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data: before } = await supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) return { ok: false, message: "Couldn't remove your photo. Try again." };

  const previous = ownAvatarPath(before?.avatar_url, userId);
  if (previous) await supabase.storage.from("avatars").remove([previous]);

  revalidatePath("/", "layout");
  return { ok: true };
}
