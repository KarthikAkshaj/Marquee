import { z } from "zod";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const settingsSchema = z.object({ external: z.object({ google: z.boolean() }) });

/**
 * Whether Google is switched on in Supabase (Authentication → Providers), read
 * from Auth's public settings. Cached for five minutes, and treated as off if
 * Supabase can't be reached, so the login page never shows a dead button.
 */
export async function isGoogleSignInEnabled() {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      next: { revalidate: 300 },
    });
    if (!response.ok) return false;
    const parsed = settingsSchema.safeParse(await response.json());
    return parsed.success && parsed.data.external.google;
  } catch {
    return false;
  }
}
