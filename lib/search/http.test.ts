// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { cleanGenres, fetchJson, toScore, yearFromDate } from "./http";

describe("search helpers", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads the year from a date, ignoring blanks", () => {
    expect(yearFromDate("2023-09-29")).toBe(2023);
    expect(yearFromDate("")).toBeUndefined();
    expect(yearFromDate(null)).toBeUndefined();
  });

  it("rounds and clamps scores, treating zero as unrated", () => {
    expect(toScore(78.4)).toBe(78);
    expect(toScore(100.2)).toBe(100);
    expect(toScore(0)).toBeUndefined();
    expect(toScore(undefined)).toBeUndefined();
    expect(toScore(Number.NaN)).toBeUndefined();
  });

  it("dedupes and caps genres", () => {
    expect(cleanGenres(["Drama", " Drama ", "", null, "Mystery"])).toEqual(["Drama", "Mystery"]);
    expect(cleanGenres([])).toBeUndefined();
    expect(cleanGenres(["a", "b", "c", "d", "e", "f", "g"])).toHaveLength(6);
  });

  it("names timeouts and never sends a cached request", async () => {
    const fetch = vi.fn(async () => {
      throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    });
    vi.stubGlobal("fetch", fetch);
    await expect(fetchJson("tmdb", "https://example.test", {}, z.object({}))).rejects.toThrow("tmdb: timed out");
    expect(fetch.mock.calls[0]).toEqual(["https://example.test", expect.objectContaining({ cache: "no-store" })]);
  });

  it("rejects bodies that aren't JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { status: 200 })));
    await expect(fetchJson("igdb", "https://example.test", {}, z.array(z.unknown()))).rejects.toThrow(
      "igdb: unexpected response shape",
    );
  });
});
