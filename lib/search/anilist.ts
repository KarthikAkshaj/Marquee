import { z } from "zod";
import { CONFIDENT, similarity } from "@/lib/match";
import { cleanGenres, fetchJson, toScore } from "./http";
import { ProviderError, RESULT_LIMIT, type Elsewhere, type OtherForm, type Release, type SearchResult, type SeriesTitle } from "./types";

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

const BASE_FIELDS = "id title { english romaji } format status episodes duration coverImage { extraLarge color } bannerImage genres averageScore";
const MEDIA_FIELDS = `${BASE_FIELDS} startDate { year }`;

/** Promo videos, music videos and recaps: never what someone means by a title they typed. */
const JUNK_TITLE = /\b(PVs?|CMs?|trailers?|teasers?|recap)\b/i;

export function isJunk(media: Pick<AniListMedia, "format" | "title">): boolean {
  return media.format === "MUSIC" || JUNK_TITLE.test(`${media.title.english ?? ""} ${media.title.romaji ?? ""}`);
}

/** Drops the junk, unless that would leave nothing at all. */
function useful(media: AniListMedia[]): SearchResult[] {
  const kept = media.filter((entry) => !isJunk(entry));
  return (kept.length ? kept : media).map(normaliseAniList).filter((result) => result !== null);
}

/**
 * Up to 10 searches in one request, as aliased GraphQL pages, for matching an
 * imported list: AniList allows about 30 requests a minute, so 67 titles are
 * 7 requests instead of 67.
 */
export async function searchAniListMany(queries: readonly string[], perPage = 6): Promise<SearchResult[][]> {
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
  return queries.map((_, index) => useful(body.data[`q${index}`]?.media ?? []));
}

const OTHER_FIELDS = "title { english romaji } format countryOfOrigin";

const otherSchema = z.object({
  title: z.object({ english: z.string().nullish(), romaji: z.string().nullish() }),
  format: z.string().nullish(),
  countryOfOrigin: z.string().nullish(),
});

/** AniList tags comics by where they came from, not by what they're called. */
function otherForm(media: z.infer<typeof otherSchema>): OtherForm {
  if (media.format === "NOVEL") return media.countryOfOrigin === "JP" ? "light novel" : "novel";
  if (media.countryOfOrigin === "KR") return "manhwa";
  if (media.countryOfOrigin === "CN" || media.countryOfOrigin === "TW") return "manhua";
  return "manga";
}

/**
 * For titles with no anime on AniList, what AniList does have instead, so the
 * row can say why it found nothing. One request for up to 10 names; a name has
 * to match closely, or an unrelated comic would "explain" the miss.
 */
export async function searchAniListOther(queries: readonly string[]): Promise<(Elsewhere | null)[]> {
  if (queries.length === 0) return [];
  if (queries.length > ANILIST_BATCH) throw new ProviderError("anilist", "too many searches in one batch");
  const variables = Object.fromEntries(queries.map((query, index) => [`s${index}`, query]));
  const query = `query (${queries.map((_, index) => `$s${index}: String`).join(", ")}) {
${queries.map((_, index) => `q${index}: Page(perPage: 3) { media(search: $s${index}, type: MANGA, isAdult: false, sort: SEARCH_MATCH) { ${OTHER_FIELDS} } }`).join("\n")}
}`;
  const schema = z.object({ data: z.record(z.string(), z.object({ media: z.array(otherSchema) })) });
  const body = await fetchJson(
    "anilist",
    ENDPOINT,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, variables }) },
    schema,
  );
  return queries.map((typed, index) => {
    for (const media of body.data[`q${index}`]?.media ?? []) {
      const names = [media.title.english, media.title.romaji].filter((name) => typeof name === "string");
      const title = names[0]?.trim();
      if (title && names.some((name) => similarity(typed, name) >= CONFIDENT)) return { form: otherForm(media), title };
    }
    return null;
  });
}

const SERIES_FIELDS = `${BASE_FIELDS} type isAdult startDate { year month day }`;

/** Each round brings the asked-for titles, their prequels and sequels, and the ids one step further on. */
const SERIES_QUERY = `query ($ids: [Int]) {
  Page(perPage: 50) {
    media(id_in: $ids, type: ANIME) {
      ${SERIES_FIELDS}
      relations { edges { relationType(version: 2) node {
        ${SERIES_FIELDS}
        relations { edges { relationType(version: 2) node { id type isAdult } } }
      } } }
    }
  }
}`;

const linkSchema = z.object({ id: z.number(), type: z.string().nullish(), isAdult: z.boolean().nullish() });
const seriesMediaSchema = mediaSchema.extend({
  type: z.string().nullish(),
  isAdult: z.boolean().nullish(),
  startDate: z.object({ year: z.number().nullish(), month: z.number().nullish(), day: z.number().nullish() }).nullish(),
});
const nextSchema = seriesMediaSchema.extend({
  relations: z.object({ edges: z.array(z.object({ relationType: z.string().nullish(), node: linkSchema.nullish() })) }).nullish(),
});
const roundSchema = z.object({
  data: z.object({
    Page: z.object({
      media: z.array(
        seriesMediaSchema.extend({
          relations: z.object({ edges: z.array(z.object({ relationType: z.string().nullish(), node: nextSchema.nullish() })) }).nullish(),
        }),
      ),
    }),
  }),
});

type SeriesMedia = z.infer<typeof seriesMediaSchema>;
type Relations<T> = { edges: { relationType?: string | null; node?: T | null }[] } | null | undefined;

/** Two rounds reach four steps either way; four rounds cover even Gintama. */
const SERIES_ROUNDS = 4;
const SERIES_LIMIT = 40;

/** Prequels and sequels only: side stories, spin-offs and the manga aren't seasons. */
function seasons<T extends { type?: string | null; isAdult?: boolean | null }>(relations: Relations<T>): T[] {
  return (relations?.edges ?? []).flatMap(({ relationType, node }) =>
    node && (relationType === "PREQUEL" || relationType === "SEQUEL") && node.type === "ANIME" && !node.isAdult ? [node] : [],
  );
}

function release(status: string | null | undefined): Release {
  if (status === "RELEASING") return "airing";
  if (status === "NOT_YET_RELEASED") return "upcoming";
  return "out";
}

/** Oldest first; titles with no date yet go last. */
function byRelease(a: SeriesMedia, b: SeriesMedia): number {
  const date = (media: SeriesMedia) => [media.startDate?.year ?? 9999, media.startDate?.month ?? 13, media.startDate?.day ?? 32];
  const [left, right] = [date(a), date(b)];
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

/**
 * Every season, film and special in an anime's run, by following AniList's
 * prequel and sequel links out from one title, two steps per request. Jujutsu
 * Kaisen's seven entries take three requests.
 */
export async function getAniListSeries(id: number): Promise<SeriesTitle[]> {
  const found = new Map<number, SeriesMedia>();
  const expanded = new Set<number>();
  let frontier = [id];
  for (let round = 0; round < SERIES_ROUNDS && frontier.length > 0 && found.size < SERIES_LIMIT; round += 1) {
    const body = await fetchJson(
      "anilist",
      ENDPOINT,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: SERIES_QUERY, variables: { ids: frontier } }) },
      roundSchema,
    );
    frontier.forEach((asked) => expanded.add(asked));
    const next = new Set<number>();
    for (const media of body.data.Page.media) {
      if (media.isAdult) continue;
      found.set(media.id, media);
      for (const near of seasons(media.relations)) {
        found.set(near.id, near);
        expanded.add(near.id);
        for (const far of seasons(near.relations)) next.add(far.id);
      }
    }
    frontier = [...next].filter((candidate) => !expanded.has(candidate));
  }
  return [...found.values()]
    .filter((media) => !isJunk(media))
    .sort(byRelease)
    .slice(0, SERIES_LIMIT)
    .flatMap((media) => {
      const result = normaliseAniList(media);
      return result ? [{ ...result, release: release(media.status) }] : [];
    });
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
