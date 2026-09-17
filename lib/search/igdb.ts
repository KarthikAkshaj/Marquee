import { z } from "zod";
import { cleanGenres, fetchJson, toScore } from "./http";
import { ProviderError, RESULT_LIMIT, type SearchResult } from "./types";

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

/** Apicalypse has no parameter binding; keep the term from closing its quotes. */
export function igdbSearchBody(query: string): string {
  const term = query.replace(/["\\]/g, " ").replace(/\s+/g, " ").trim();
  return [
    `search "${term}";`,
    "fields name,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,platforms.abbreviation,total_rating,total_rating_count;",
    `where version_parent = null & game_type = (${GAME_TYPES.join(",")});`,
    "limit 20;",
  ].join(" ");
}

const gamesSchema = z.array(gameSchema);

async function requestGames(query: string, token: AppToken) {
  const { clientId } = credentials();
  return fetchJson(
    "igdb",
    GAMES,
    {
      method: "POST",
      headers: { "Client-ID": clientId, Authorization: `Bearer ${token.value}`, "Content-Type": "text/plain" },
      body: igdbSearchBody(query),
    },
    gamesSchema,
  );
}

export async function searchIgdb(query: string): Promise<SearchResult[]> {
  let games: IgdbGame[];
  try {
    games = await requestGames(query, await getAppToken());
  } catch (error) {
    // Twitch can revoke a token before it expires; get a new one and try once more.
    if (!(error instanceof ProviderError && error.status === 401)) throw error;
    games = await requestGames(query, await refreshAppToken());
  }
  return rankGames(games, query)
    .map(normaliseIgdbGame)
    .filter((result) => result !== null)
    .slice(0, RESULT_LIMIT);
}
