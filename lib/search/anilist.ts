import { z } from "zod";
import { cleanGenres, fetchJson, toScore } from "./http";
import { ProviderError, RESULT_LIMIT, type SearchResult } from "./types";

const ENDPOINT = "https://graphql.anilist.co";

const QUERY = `query ($search: String, $perPage: Int) {
  Page(perPage: $perPage) {
    media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
      id
      title { english romaji }
      format
      status
      episodes
      duration
      startDate { year }
      coverImage { extraLarge color }
      bannerImage
      genres
      averageScore
    }
  }
}`;

const mediaSchema = z.object({
  id: z.number(),
  title: z.object({ english: z.string().nullish(), romaji: z.string().nullish() }),
  format: z.string().nullish(),
  status: z.string().nullish(),
  episodes: z.number().nullish(),
  duration: z.number().nullish(),
  startDate: z.object({ year: z.number().nullish() }).nullish(),
  coverImage: z.object({ extraLarge: z.string().nullish(), color: z.string().nullish() }).nullish(),
  bannerImage: z.string().nullish(),
  genres: z.array(z.string().nullish()).nullish(),
  averageScore: z.number().nullish(),
});

export type AniListMedia = z.infer<typeof mediaSchema>;

const responseSchema = z.object({
  data: z.object({ Page: z.object({ media: z.array(mediaSchema) }) }),
});

const FORMATS: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
};

/** Still coming out, so the episode count isn't final. */
const UNFINISHED = new Set(["RELEASING", "NOT_YET_RELEASED"]);

function subtitle(media: AniListMedia): string | undefined {
  const format = media.format ? (FORMATS[media.format] ?? media.format) : undefined;
  let detail: string | undefined;
  if (media.status === "RELEASING") detail = "Airing";
  else if (media.status === "NOT_YET_RELEASED") detail = "Upcoming";
  else if (media.format === "MOVIE" && media.duration) detail = `${media.duration} min`;
  else if (media.episodes) detail = `${media.episodes} ${media.episodes === 1 ? "ep" : "eps"}`;
  return [format, detail].filter(Boolean).join(" · ") || undefined;
}

export function normaliseAniList(media: AniListMedia): SearchResult | null {
  const title = media.title.english?.trim() || media.title.romaji?.trim();
  if (!title) return null;

  const color = media.coverImage?.color;
  return {
    source: "anilist",
    externalId: String(media.id),
    title,
    altTitle: media.title.romaji?.trim() && media.title.romaji.trim() !== title ? media.title.romaji.trim() : undefined,
    year: media.startDate?.year ?? undefined,
    coverUrl: media.coverImage?.extraLarge ?? undefined,
    backdropUrl: media.bannerImage ?? undefined,
    progressTotal: media.status && UNFINISHED.has(media.status) ? undefined : (media.episodes ?? undefined),
    subtitle: subtitle(media),
    genres: cleanGenres(media.genres ?? []),
    communityScore: toScore(media.averageScore),
    accentColor: color && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : undefined,
  };
}

/** Most searches one AniList request carries when matching a list. */
export const ANILIST_BATCH = 10;

const MEDIA_FIELDS = "id title { english romaji } format status episodes duration startDate { year } coverImage { extraLarge color } bannerImage genres averageScore";

/**
 * Up to 10 searches in one request, as aliased GraphQL pages, for matching an
 * imported list: AniList allows about 30 requests a minute, so 67 titles are
 * 7 requests instead of 67.
 */
export async function searchAniListMany(queries: readonly string[], perPage = 5): Promise<SearchResult[][]> {
  if (queries.length === 0) return [];
  if (queries.length > ANILIST_BATCH) throw new ProviderError("anilist", "too many searches in one batch");
  const variables = Object.fromEntries(queries.map((query, index) => [`s${index}`, query]));
  const query = `query (${queries.map((_, index) => `$s${index}: String`).join(", ")}) {
${queries.map((_, index) => `q${index}: Page(perPage: ${perPage}) { media(search: $s${index}, type: ANIME, isAdult: false, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }`).join("\n")}
}`;
  const schema = z.object({ data: z.record(z.string(), z.object({ media: z.array(mediaSchema) })) });
  const body = await fetchJson(
    "anilist",
    ENDPOINT,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) },
    schema,
  );
  return queries.map((_, index) => (body.data[`q${index}`]?.media ?? []).map(normaliseAniList).filter((result) => result !== null));
}

export async function searchAniList(query: string): Promise<SearchResult[]> {
  const body = await fetchJson(
    "anilist",
    ENDPOINT,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { search: query, perPage: RESULT_LIMIT } }),
    },
    responseSchema,
  );
  return body.data.Page.media.map(normaliseAniList).filter((result) => result !== null);
}
