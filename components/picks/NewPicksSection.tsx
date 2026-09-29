import { moodParam, readMood } from "@/lib/moods";
import { moodPicksFor, recommendedPicks, type PickContext } from "@/lib/picks";
import { NewPicks } from "./NewPicks";

/**
 * "New to you" for the address the page opened at (SPEC §20), streamed in
 * after the rest of the page while the providers answer. Moods picked after
 * that are fetched by the section itself, from /api/picks.
 */
export async function NewPicksSection({ context, mood }: { context: PickContext; mood: string | null }) {
  const choice = readMood(mood);
  const payload = choice ? await moodPicksFor(context, choice) : await recommendedPicks(context);
  return <NewPicks initial={{ ...payload, mood: moodParam(choice) ?? "" }} shelves={context.offered} />;
}
