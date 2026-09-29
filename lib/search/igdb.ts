import { z } from "zod";
import { cleanGenres, fetchJson, toScore } from "./http";
import { ProviderError, RESULT_LIMIT, type IgdbFilter, type SearchResult, type SeedSuggestions, type Suggestion } from "./types";

const GAMES = "https://api.igdb.com/v4/games";
const TOKEN = "https://id.twitch.tv/oauth2/token";
const IMAGE = "https://images.igdb.com/igdb/image/upload";
/** Refresh the app token a minute early rather than racing its expiry. */
const EXPIRY_MARGIN_MS = 60_000;
/** Main games, expansions, remakes, remasters, ports. Leaves out DLC, bundles, mods, packs and updates. */
const GAME_TYPES = [0, 2, 4, 8, 9, 10, 11];

export function igdbConfigured(): boolean {
  return Boolean(process.env.TWITCH_CLIENT_ID?.trim() && process.env.TWITCH_CLIENT_SECRET?.trim());
}

function credentials() {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new ProviderError("igdb", "TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET are not set");
  return { clientId, clientSecret };
}

const tokenSchema = z.object({ access_token: z.string(), expires_in: z.number() });

type AppToken = { value: string; expiresAt: number };

/** One Twitch app token per server process, shared by every user's searches. */
let appToken: Promise<AppToken> | null = null;

function getAppToken(): Promise<AppToken> {
  if (!appToken) return refreshAppToken();
  return appToken.then((token) => (token.expiresAt - EXPIRY_MARGIN_MS > Date.now() ? token : refreshAppToken()));
}

function refreshAppToken(): Promise<AppToken> {
  const { clientId, clientSecret } = credentials();
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" });
  const requestedAt = Date.now();
  const pending = fetchJson("igdb", `${TOKEN}?${params}`, { method: "POST" }, tokenSchema).then((body) => ({
    value: body.access_token,
    expiresAt: requestedAt + body.expires_in * 1000,
  }));
  appToken = pending;
  pending.catch(() => {
    if (appToken === pending) appToken = null;
  });
  return pending;
}

/** Test hook: forget the cached Twitch token. */
export function resetIgdbToken() {
  appToken = null;
}

const imageSchema = z.object({ image_id: z.string() });

const gameSchema = z.object({
  id: z.number(),
  name: z.string().nullish(),
  first_release_date: z.number().nullish(),
  cover: imageSchema.nullish(),
  artworks: z.array(imageSchema).nullish(),
  screenshots: z.array(imageSchema).nullish(),
  genres: z.array(z.object({ name: z.string().nullish() })).nullish(),
  platforms: z.array(z.object({ abbreviation: z.string().nullish() })).nullish(),
  total_rating: z.number().nullish(),
  total_rating_count: z.number().nullish(),
});

export type IgdbGame = z.infer<typeof gameSchema>;

function platforms(game: IgdbGame): string | undefined {
  const names = [...new Set((game.platforms ?? []).map((p) => p.abbreviation?.trim()).filter(Boolean))];
  if (!names.length) return undefined;
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
}

export function normaliseIgdbGame(game: IgdbGame): SearchResult | null {
  const title = game.name?.trim();
  if (!title) return null;
  const backdrop = game.artworks?.[0] ?? game.screenshots?.[0];
  return {
    source: "igdb",
    externalId: String(game.id),
    title,
    year: game.first_release_date ? new Date(game.first_release_date * 1000).getUTCFullYear() : undefined,
    // 2x so posters stay sharp on high-density screens; next/image scales down.
    coverUrl: game.cover ? `${IMAGE}/t_cover_big_2x/${game.cover.image_id}.jpg` : undefined,
    backdropUrl: backdrop ? `${IMAGE}/t_1080p/${backdrop.image_id}.jpg` : undefined,
    subtitle: platforms(game),
    genres: cleanGenres((game.genres ?? []).map((genre) => genre.name)),
    communityScore: toScore(game.total_rating),
  };
}

/**
 * IGDB's relevance order puts obscure namesakes first (1995's "Hades" above
 * 2020's). Titles that start with the query come first, most-rated first.
 */
export function rankGames(games: readonly IgdbGame[], query: string): IgdbGame[] {
  const q = query.trim().toLowerCase();
  const startsWith = (game: IgdbGame) => (game.name?.trim().toLowerCase().startsWith(q) ? 0 : 1);
  return [...games].sort(
    (a, b) => startsWith(a) - startsWith(b) || (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0),
  );
}

/** What a game needs to be shown and added. */
const GAME_FIELDS = [
  "name",
  "first_release_date",
  "cover.image_id",
  "artworks.image_id",
  "screenshots.image_id",
  "genres.name",
  "platforms.abbreviation",
  "total_rating",
  "total_rating_count",
];

/** Apicalypse has no parameter binding; keep the term from closing its quotes. */
export function igdbSearchBody(query: string): string {
  const term = query.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  return [
    `search "${term}";`,
    `fields ${GAME_FIELDS.join(",")};`,
    `where version_parent = null & game_type = (${GAME_TYPES.join(",")});`,
    "limit 20;",
  ].join(" ");
}

const gamesSchema = z.array(gameSchema);

async function requestGames<T extends z.ZodType>(body: string, schema: T, token: AppToken): Promise<z.infer<T>> {
  const { clientId } = credentials();
  return fetchJson(
    "igdb",
    GAMES,
    {
      method: "POST",
      headers: { "Client-ID": clientId, Authorization: `Bearer ${token.value}`, "Content-Type": "text/plain" },
      body,
    },
    schema,
  );
}

/** One query, with a fresh token and a second try if Twitch revoked the old one before it expired. */
async function queryGames<T extends z.ZodType>(body: string, schema: T): Promise<z.infer<T>> {
  try {
    return await requestGames(body, schema, await getAppToken());
  } catch (error) {
    if (!(error instanceof ProviderError && error.status === 401)) throw error;
    return requestGames(body, schema, await refreshAppToken());
  }
}

export async function searchIgdb(query: string): Promise<SearchResult[]> {
  const games = await queryGames(igdbSearchBody(query), gamesSchema);
  return rankGames(games, query)
    .map(normaliseIgdbGame)
    .filter((result) => result !== null)
    .slice(0, RESULT_LIMIT);
}

/** Most seed games one request asks about for For you (SPEC §20). */
export const IGDB_SEED_BATCH = 10;
const SUGGESTIONS_PER_SEED = 10;
/** Fewer ratings than this, and a similar game is too obscure to put in front of someone. */
const MIN_SUGGESTION_RATINGS = 10;

const SIMILAR_FIELDS = [...GAME_FIELDS, "game_type", "version_parent"];

export function igdbSimilarBody(ids: readonly number[]): string {
  return [
    `fields id,${SIMILAR_FIELDS.map((field) => `similar_games.${field}`).join(",")};`,
    `where id = (${ids.join(",")});`,
    `limit ${ids.length};`,
  ].join(" ");
}

const similarSchema = gameSchema.extend({ game_type: z.number().nullish(), version_parent: z.number().nullish() });
const seedsSchema = z.array(z.object({ id: z.number(), similar_games: z.array(similarSchema).nullish() }));

export type IgdbSeed = z.infer<typeof seedsSchema>[number];

/**
 * IGDB's similar games for one of yours. It lists them in no useful order, so
 * the most-rated come first. DLC, editions, anything not out yet and games
 * hardly anyone has rated are dropped.
 */
export function normaliseSimilar(seed: IgdbSeed, now = Date.now()): SeedSuggestions {
  const suggestions = (seed.similar_games ?? [])
    .filter((game) => GAME_TYPES.includes(game.game_type ?? 0) && game.version_parent == null)
    .filter((game) => (game.total_rating_count ?? 0) >= MIN_SUGGESTION_RATINGS)
    .filter((game) => game.first_release_date != null && game.first_release_date * 1000 <= now)
    .sort((a, b) => (b.total_rating_count ?? 0) - (a.total_rating_count ?? 0))
    .map(normaliseIgdbGame)
    .filter((result) => result !== null)
    .slice(0, SUGGESTIONS_PER_SEED)
    .map((result) => ({ result }));
  return { seed: String(seed.id), suggestions };
}

/** Games like each of up to 10 of yours, in one request, for For you's new titles. */
export async function getIgdbSuggestions(ids: readonly string[]): Promise<SeedSuggestions[]> {
  const numeric = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (numeric.length === 0) return [];
  if (numeric.length > IGDB_SEED_BATCH) throw new ProviderError("igdb", "too many seeds in one batch");
  const seeds = await queryGames(igdbSimilarBody(numeric), seedsSchema);
  return seeds.map((seed) => normaliseSimilar(seed));
}

/** Fewest ratings for a game in a mood's list, so it isn't a row of curiosities. */
const DISCOVER_RATINGS = 100;
const DISCOVER_LIMIT = 50;

/**
 * IGDB's query for a mood: any of the themes, genres or keywords, main games
 * only, out already, best rated first. Ids only ever come from our own lists
 * or IGDB's, and are checked to be whole numbers anyway.
 */
export function igdbDiscoverBody(filter: IgdbFilter, now = Date.now()): string | null {
  const ids = (list: readonly number[] | undefined) => (list ?? []).filter((id) => Number.isInteger(id) && id > 0);
  const any = (["themes", "genres", "keywords"] as const)
    .filter((field) => ids(filter[field]).length > 0)
    .map((field) => `${field} = (${ids(filter[field]).join(",")})`);
  if (any.length === 0) return null;
  return [
    `fields ${GAME_FIELDS.join(",")};`,
    `where (${any.join(" | ")}) & game_type = (${GAME_TYPES.join(",")}) & version_parent = null`,
    `& total_rating_count >= ${DISCOVER_RATINGS} & first_release_date < ${Math.floor(now / 1000)};`,
    "sort total_rating desc;",
    `limit ${DISCOVER_LIMIT};`,
  ].join(" ");
}

/** IGDB's best-rated games for a mood (SPEC §20). */
export async function discoverIgdb(filter: IgdbFilter): Promise<Suggestion[]> {
  const body = igdbDiscoverBody(filter);
  if (!body) return [];
  const games = await queryGames(body, gamesSchema);
  return games.flatMap((game) => {
    const result = normaliseIgdbGame(game);
    return result ? [{ result }] : [];
  });
}
