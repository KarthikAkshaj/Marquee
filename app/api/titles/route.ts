import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Every title the viewer has, lightly, for the palette's "Your titles" (SPEC
 * §8.8). Fetched when the palette opens rather than with every page, so the
 * layout doesn't ship the whole library on each navigation. RLS scopes it.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ titles: [] }, { status: 401 });

  const { data, error } = await supabase
    .from("items")
    .select("id, title, status, year, cover_url, accent_color, source, external_id, category_id")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ titles: [] }, { status: 500 });

  return NextResponse.json({ titles: data }, { headers: { "Cache-Control": "private, no-store" } });
}
