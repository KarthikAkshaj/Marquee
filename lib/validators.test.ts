import { describe, expect, it } from "vitest";
import {
  addFromSearchSchema,
  avatarFileSchema,
  createCategorySchema,
  createItemSchema,
  emailSchema,
  itemAccentSchema,
  itemDetailsSchema,
  itemFavoriteSchema,
  itemIdSchema,
  itemProgressSchema,
  itemStatusSchema,
  moveItemSchema,
  otpCodeSchema,
  profileSchema,
  reorderCategoriesSchema,
  safeRedirectPath,
  searchQuerySchema,
  updateCategorySchema,
  usernameSchema,
} from "./validators";

describe("safeRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectPath("/c/anime")).toBe("/c/anime");
    expect(safeRedirectPath("/home?item=1")).toBe("/home?item=1");
  });

  it("falls back when missing", () => {
    expect(safeRedirectPath(null)).toBe("/home");
    expect(safeRedirectPath("")).toBe("/home");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/home");
    expect(safeRedirectPath("//evil.example")).toBe("/home");
    expect(safeRedirectPath("evil.example")).toBe("/home");
  });

  it("rejects backslash tricks that browsers read as //", () => {
    // Built from a char code so no layer of escaping can quietly eat it.
    const backslash = String.fromCharCode(92);
    expect(safeRedirectPath(`/${backslash}evil.example`)).toBe("/home");
    expect(safeRedirectPath(`/${backslash}${backslash}evil.example`)).toBe("/home");
  });
});

describe("emailSchema", () => {
  it("accepts and trims a real address", () => {
    expect(emailSchema.parse("  you@example.com ")).toBe("you@example.com");
  });

  it("rejects junk", () => {
    expect(emailSchema.safeParse("nope").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("otpCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpCodeSchema.safeParse("042917").success).toBe(true);
  });

  it("rejects short, long or non-numeric codes", () => {
    for (const code of ["12345", "1234567", "12a456", " 123456", ""]) {
      expect(otpCodeSchema.safeParse(code).success).toBe(false);
    }
  });
});

describe("createItemSchema", () => {
  const base = {
    categoryId: "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11",
    title: "  Frieren  ",
    year: "",
    status: "planned",
    progressTotal: "",
  };

  it("trims the title and treats empty optional fields as missing", () => {
    const parsed = createItemSchema.parse(base);
    expect(parsed.title).toBe("Frieren");
    expect(parsed.year).toBeUndefined();
    expect(parsed.progressTotal).toBeUndefined();
  });

  it("coerces numbers from form strings", () => {
    const parsed = createItemSchema.parse({ ...base, year: "2023", progressTotal: "28" });
    expect(parsed.year).toBe(2023);
    expect(parsed.progressTotal).toBe(28);
  });

  it("rejects bad input with a readable message", () => {
    const result = createItemSchema.safeParse({ ...base, title: "   ", year: "20x3", status: "watching" });
    expect(result.success).toBe(false);
    expect(createItemSchema.safeParse({ ...base, year: "1500" }).success).toBe(false);
    expect(createItemSchema.safeParse({ ...base, progressTotal: "0" }).success).toBe(false);
    expect(createItemSchema.safeParse({ ...base, categoryId: "anime" }).success).toBe(false);
  });

  it("takes the episode you're on, up to the total", () => {
    const partway = createItemSchema.parse({ ...base, status: "in_progress", progressTotal: "1100", progressCurrent: "800" });
    expect(partway.progressCurrent).toBe(800);
    expect(createItemSchema.parse({ ...base, progressTotal: "12", progressCurrent: "12" }).progressCurrent).toBe(12);
    expect(createItemSchema.parse({ ...base, progressCurrent: "" }).progressCurrent).toBeUndefined();
    // No total yet: any count is fine.
    expect(createItemSchema.parse({ ...base, progressCurrent: "800" }).progressCurrent).toBe(800);
  });

  it("rejects an episode past the total, below zero or not whole", () => {
    const past = createItemSchema.safeParse({ ...base, progressTotal: "12", progressCurrent: "13" });
    expect(past.success).toBe(false);
    expect(past.error?.issues[0]?.path).toEqual(["progressCurrent"]);
    expect(createItemSchema.safeParse({ ...base, progressCurrent: "-1" }).success).toBe(false);
    expect(createItemSchema.safeParse({ ...base, progressCurrent: "2.5" }).success).toBe(false);
  });
});

describe("quick action schemas", () => {
  const id = "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11";

  it("accepts a real id with a known status or a favourite flag", () => {
    expect(itemStatusSchema.safeParse({ id, status: "dropped" }).success).toBe(true);
    expect(itemFavoriteSchema.safeParse({ id, favorite: false }).success).toBe(true);
    expect(itemIdSchema.safeParse(id).success).toBe(true);
  });

  it("rejects made-up statuses, loose flags and non-ids", () => {
    expect(itemStatusSchema.safeParse({ id, status: "watching" }).success).toBe(false);
    expect(itemFavoriteSchema.safeParse({ id, favorite: "true" }).success).toBe(false);
    expect(itemIdSchema.safeParse("frieren").success).toBe(false);
  });
});

describe("itemProgressSchema", () => {
  const id = "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11";

  it("takes a count with a total, or no total while airing", () => {
    expect(itemProgressSchema.safeParse({ id, current: 800, total: 1100 }).success).toBe(true);
    expect(itemProgressSchema.safeParse({ id, current: 13, total: null }).success).toBe(true);
  });

  it("rejects a count past the total, a zero total and fractions", () => {
    expect(itemProgressSchema.safeParse({ id, current: 13, total: 12 }).success).toBe(false);
    expect(itemProgressSchema.safeParse({ id, current: 0, total: 0 }).success).toBe(false);
    expect(itemProgressSchema.safeParse({ id, current: 1.5, total: null }).success).toBe(false);
  });
});

describe("itemDetailsSchema", () => {
  it("accepts any one field on its own", () => {
    expect(itemDetailsSchema.parse({ rating: 8 })).toEqual({ rating: 8 });
    expect(itemDetailsSchema.parse({ rating: null })).toEqual({ rating: null });
    expect(itemDetailsSchema.parse({ title: "  One Piece " })).toEqual({ title: "One Piece" });
    expect(itemDetailsSchema.parse({ started_at: "2026-08-02", finished_at: null })).toEqual({
      started_at: "2026-08-02",
      finished_at: null,
    });
  });

  it("stores blank notes as none", () => {
    expect(itemDetailsSchema.parse({ notes: "   " })).toEqual({ notes: null });
    expect(itemDetailsSchema.parse({ notes: "Ep 7!" })).toEqual({ notes: "Ep 7!" });
  });

  it("rejects half ratings, bad dates, unknown fields and empty saves", () => {
    expect(itemDetailsSchema.safeParse({ rating: 8.5 }).success).toBe(false);
    expect(itemDetailsSchema.safeParse({ rating: 11 }).success).toBe(false);
    expect(itemDetailsSchema.safeParse({ started_at: "02-08-2026" }).success).toBe(false);
    expect(itemDetailsSchema.safeParse({ year: 1500 }).success).toBe(false);
    expect(itemDetailsSchema.safeParse({ user_id: "someone-else" }).success).toBe(false);
    expect(itemDetailsSchema.safeParse({}).success).toBe(false);
  });
});

describe("moveItemSchema", () => {
  it("needs two real ids", () => {
    const id = "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11";
    expect(moveItemSchema.safeParse({ id, categoryId: id }).success).toBe(true);
    expect(moveItemSchema.safeParse({ id, categoryId: "movies" }).success).toBe(false);
  });
});

describe("category schemas", () => {
  const id = "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11";
  const valid = { name: "  K-Dramas ", kind: "series", color: "rose", icon: "heart" } as const;

  it("accepts known kinds, colour tokens and icons, trimming the name", () => {
    expect(createCategorySchema.parse(valid)).toEqual({ ...valid, name: "K-Dramas" });
    expect(updateCategorySchema.safeParse({ id, kind: "game" }).success).toBe(true);
  });

  it("rejects hex colours, unknown icons, long or blank names and empty updates", () => {
    expect(createCategorySchema.safeParse({ ...valid, color: "#ff0000" }).success).toBe(false);
    expect(createCategorySchema.safeParse({ ...valid, icon: "skull" }).success).toBe(false);
    expect(createCategorySchema.safeParse({ ...valid, name: "   " }).success).toBe(false);
    expect(createCategorySchema.safeParse({ ...valid, name: "x".repeat(41) }).success).toBe(false);
    expect(updateCategorySchema.safeParse({ id }).success).toBe(false);
    expect(updateCategorySchema.safeParse({ id, slug: "sneaky" }).success).toBe(false);
  });

  it("takes each id once when reordering", () => {
    const other = "8d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11";
    expect(reorderCategoriesSchema.safeParse([id, other]).success).toBe(true);
    expect(reorderCategoriesSchema.safeParse([id, id]).success).toBe(false);
    expect(reorderCategoriesSchema.safeParse([]).success).toBe(false);
  });
});

describe("profile schemas", () => {
  it("trims, lowercases the username and stores a blank bio as none", () => {
    expect(profileSchema.parse({ display_name: "  Akuma ", username: " Night_Owl ", bio: "   " })).toEqual({
      display_name: "Akuma",
      username: "night_owl",
      bio: null,
    });
  });

  it("holds the same username rule as the database", () => {
    for (const bad of ["ab", "has space", "dash-name", "x".repeat(21), "émile"]) {
      expect(usernameSchema.safeParse(bad).success).toBe(false);
    }
    expect(usernameSchema.safeParse("akuma_3f9c").success).toBe(true);
  });

  it("rejects an empty name, a long bio, and photos the bucket won't take", () => {
    expect(profileSchema.safeParse({ display_name: " ", username: "akuma", bio: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ display_name: "A", username: "akuma", bio: "x".repeat(161) }).success).toBe(false);
    expect(avatarFileSchema.safeParse({ type: "image/webp", size: 48_000 }).success).toBe(true);
    expect(avatarFileSchema.safeParse({ type: "image/gif", size: 48_000 }).success).toBe(false);
    expect(avatarFileSchema.safeParse({ type: "image/png", size: 3 * 1024 * 1024 }).success).toBe(false);
  });
});

describe("searchQuerySchema", () => {
  it("takes provider kinds and trimmed queries of 2–100 characters", () => {
    expect(searchQuerySchema.parse({ kind: "anime", q: "  frieren " })).toEqual({ kind: "anime", q: "frieren" });
    expect(searchQuerySchema.safeParse({ kind: "custom", q: "frieren" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ kind: "movie", q: " a " }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ kind: "game", q: "x".repeat(101) }).success).toBe(false);
  });
});

describe("addFromSearchSchema", () => {
  const input = {
    id: "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11",
    categoryId: "0b5a3a2e-1f0c-4c6e-9a7d-3e2f1a0b9c8d",
    status: "planned",
    result: {
      source: "tmdb",
      externalId: "438631",
      title: "Dune",
      year: 2021,
      coverUrl: "https://image.tmdb.org/t/p/w500/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg",
      genres: ["Science Fiction", "Adventure"],
      communityScore: 78,
      accentColor: "#C08040",
    },
  };

  it("keeps a real result and normalises its colour", () => {
    const parsed = addFromSearchSchema.parse(input);
    expect(parsed.result).toMatchObject({ title: "Dune", coverUrl: input.result.coverUrl, accentColor: "#c08040" });
  });

  it("drops extras that don't check out instead of refusing the add", () => {
    const parsed = addFromSearchSchema.parse({
      ...input,
      result: { ...input.result, coverUrl: "https://evil.example/x.jpg", year: 1066, communityScore: 140, genres: "Drama" },
    });
    expect(parsed.result.coverUrl).toBeUndefined();
    expect(parsed.result.year).toBeUndefined();
    expect(parsed.result.communityScore).toBeUndefined();
    expect(parsed.result.genres).toBeUndefined();
    expect(parsed.result.title).toBe("Dune");
  });

  it("refuses a result it can't identify", () => {
    expect(addFromSearchSchema.safeParse({ ...input, result: { ...input.result, source: "manual" } }).success).toBe(false);
    expect(addFromSearchSchema.safeParse({ ...input, result: { ...input.result, externalId: "../1" } }).success).toBe(false);
    expect(addFromSearchSchema.safeParse({ ...input, result: { ...input.result, title: " " } }).success).toBe(false);
    expect(addFromSearchSchema.safeParse({ ...input, id: "not-a-uuid" }).success).toBe(false);
  });

  it("only takes hex colours for the cover glow", () => {
    expect(itemAccentSchema.safeParse({ id: input.id, color: "#3a5f8c" }).success).toBe(true);
    expect(itemAccentSchema.safeParse({ id: input.id, color: "red; background:url(x)" }).success).toBe(false);
  });
});
