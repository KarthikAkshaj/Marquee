import type { Release, SearchResult } from "@/lib/search/types";
import type { ItemStatus } from "@/lib/status";

/** Case, accents, punctuation and spacing don't matter: "One-Punch Man" is "one punch man". */
export function normaliseName(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (let index = 0; index < text.length - 1; index += 1) {
    const pair = text.slice(index, index + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

/** Sørensen–Dice over letter pairs: "haikyuu" vs "haikyu" ≈ 0.91. */
function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const left = bigrams(a);
  const right = bigrams(b);
  let shared = 0;
  for (const [pair, count] of left) shared += Math.min(count, right.get(pair) ?? 0);
  return (2 * shared) / (a.length - 1 + (b.length - 1));
}

/**
 * How close a typed title is to an official one, 0–1. Exact (ignoring case and
 * punctuation) is 1; typing the start of a longer official title ("Demon
 * Slayer" for "Demon Slayer: Kimetsu no Yaiba") scores high but below exact;
 * otherwise letter-pair overlap, which forgives small spelling differences.
 */
export function similarity(typed: string, official: string): number {
  const a = normaliseName(typed);
  const b = normaliseName(official);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const squashedA = a.replace(/ /g, "");
  const squashedB = b.replace(/ /g, "");
  if (squashedA === squashedB) return 0.98;
  let score = dice(squashedA, squashedB);
  if (a.length >= 4 && b.startsWith(`${a} `)) score = Math.max(score, 0.9 - Math.min(0.15, (b.length - a.length) / 200));
  return score;
}

export type Match = {
  /** Index into the candidates. */
  index: number;
  similarity: number;
  /** Close enough to tick without asking. */
  confident: boolean;
};

/** A best match this close or closer is ticked straight away. */
export const CONFIDENT = 0.8;

/**
 * The candidate that best fits what was typed: name similarity (against both
 * the English and the original title), nudged towards the year given and, for
 * anime, towards the TV series over its movies and specials; ties keep the
 * provider's order.
 */
export function bestMatch(typed: string, year: number | null, candidates: readonly SearchResult[]): Match | null {
  let best: (Match & { score: number }) | null = null;
  candidates.forEach((candidate, index) => {
    const name = Math.max(similarity(typed, candidate.title), candidate.altTitle ? similarity(typed, candidate.altTitle) : 0);
    const score =
      name +
      (year && candidate.year === year ? 0.05 : 0) +
      (candidate.source === "anilist" && candidate.subtitle?.startsWith("TV") ? 0.06 : 0) -
      index * 0.01;
    if (!best || score > best.score) best = { index, similarity: name, confident: name >= CONFIDENT, score };
  });
  if (!best) return null;
  const { index, similarity: name, confident } = best;
  return { index, similarity: name, confident };
}

/**
 * The status another season goes in as: the same as the title it came from,
 * except that nothing unreleased is finished or underway, and a season still
 * airing can't be finished yet.
 */
export function seasonStatus(from: ItemStatus, release: Release): ItemStatus {
  if (release === "upcoming") return "planned";
  if (release === "airing" && from === "completed") return "in_progress";
  return from;
}

/**
 * Splits picks into saves of at most `rows` titles and `extras` added seasons
 * each, keeping their order.
 */
export function saveBatches<T extends { extras: readonly unknown[] }>(picks: readonly T[], rows: number, extras: number): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let seasons = 0;
  for (const pick of picks) {
    if (current.length > 0 && (current.length === rows || seasons + pick.extras.length > extras)) {
      batches.push(current);
      current = [];
      seasons = 0;
    }
    current.push(pick);
    seasons += pick.extras.length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

type Keyed = Pick<SearchResult, "source" | "externalId">;
type ClaimRow = { id: string; title: string; include: boolean; pick: Keyed | null; extras: readonly Keyed[] };
type Holder = { rowId: string | null; title: string };

export const matchKey = (result: Keyed) => `${result.source}:${result.externalId}`;

/**
 * A search result can sit on a shelf only once. Titles already there hold
 * theirs; then each ticked row, top to bottom, claims its match and its extra
 * seasons. A match someone else holds is a conflict, and won't be saved.
 */
export function claimMatches(rows: readonly ClaimRow[], taken: readonly { key: string; title: string }[]) {
  const holders = new Map<string, Holder>(taken.map((entry) => [entry.key, { rowId: null, title: entry.title }]));
  const conflicts = new Map<string, string>();
  for (const row of rows) {
    if (!row.include || !row.pick) continue;
    const holder = holders.get(matchKey(row.pick));
    if (holder) {
      conflicts.set(row.id, holder.rowId ? `Already picked for “${holder.title}”` : `Already on this shelf as “${holder.title}”`);
      continue;
    }
    holders.set(matchKey(row.pick), { rowId: row.id, title: row.title });
    for (const extra of row.extras) {
      if (!holders.has(matchKey(extra))) holders.set(matchKey(extra), { rowId: row.id, title: row.title });
    }
  }
  return { holders, conflicts };
}

/** Why a row can't have this season too, or null when it can. */
export function blockedReason(holders: ReadonlyMap<string, Holder>, key: string, rowId: string): string | null {
  const holder = holders.get(key);
  if (!holder || holder.rowId === rowId) return null;
  return holder.rowId ? `Picked for “${holder.title}”` : `On your shelf as “${holder.title}”`;
}
