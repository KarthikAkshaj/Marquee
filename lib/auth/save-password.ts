import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import { PASSWORD_FLAG } from "./password";

type Auth = { auth: Pick<SupabaseClient["auth"], "updateUser"> };

/**
 * Sets the signed-in user's password and marks that they have one. Server
 * actions only. Choosing the password they already have still counts as saved.
 * `nonce` is the emailed code Supabase asks for when the session is old and
 * secure password change is on.
 */
export async function savePassword(supabase: Auth, password: string, nonce?: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.updateUser({ password, nonce, data: { [PASSWORD_FLAG]: true } });
  if (error?.code !== "same_password") return error;
  const { error: flagError } = await supabase.auth.updateUser({ data: { [PASSWORD_FLAG]: true } });
  return flagError;
}
