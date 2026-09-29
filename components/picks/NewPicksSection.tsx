import { recommendedPicks, type PickContext } from "@/lib/picks";
import { NewPicks } from "./NewPicks";

/**
 * "New to you" as the page opens (SPEC §20): the usual picks, streamed in
 * after the rest of the page while the providers answer. A mood, whether in
 * the link or picked after, is fetched by the section itself from /api/picks.
 */
export async function NewPicksSection({ context }: { context: PickContext }) {
  const payload = await recommendedPicks(context);
  return <NewPicks initial={{ ...payload, mood: "" }} shelves={context.offered} />;
}
