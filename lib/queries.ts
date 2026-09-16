import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-request cached reads shared by the app shell and pages, so the sidebar
 * and the page don't each hit the database for the same rows.
 * Every query runs as the signed-in user; RLS scopes the results.
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  // proxy.ts already guards (app) routes; this is the belt to its braces.
  if (!claims) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error) throw new Error(`Couldn't load your profile: ${error.message}`);

  return { id: claims.sub, email: claims.email ?? null, profile };
});

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, kind, color, icon, position, items(count)")
    .order("position");

  if (error) throw new Error(`Couldn't load your categories: ${error.message}`);

  return data.map(({ items, ...category }) => ({
    ...category,
    itemCount: items[0]?.count ?? 0,
  }));
});

export type CategoryWithCount = Awaited<ReturnType<typeof getCategories>>[number];
