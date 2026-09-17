import { describe, expect, it } from "vitest";
import { USERNAME_PATTERN, normaliseUsername, ownAvatarPath, suggestUsername } from "./profile";

describe("normaliseUsername", () => {
  it("lowercases and turns spaces into underscores", () => {
    expect(normaliseUsername("  Night Owl ")).toBe("night_owl");
  });
});

describe("suggestUsername", () => {
  it("offers a valid nearby name, even for long ones", () => {
    expect(suggestUsername("akuma", () => 0.3)).toBe("akuma_37");
    const long = suggestUsername("a_very_long_username", () => 0.99);
    expect(long).toHaveLength(20);
    expect(USERNAME_PATTERN.test(long)).toBe(true);
  });
});

describe("ownAvatarPath", () => {
  const user = "7d8f2a64-3a4e-4c1b-9b5f-2e9a1c0d4b11";
  const base = "https://abc.supabase.co/storage/v1/object/public/avatars";

  it("finds the path of the user's own upload", () => {
    expect(ownAvatarPath(`${base}/${user}/1726560000000.webp`, user)).toBe(`${user}/1726560000000.webp`);
    expect(ownAvatarPath(`${base}/${user}/1.webp?t=2`, user)).toBe(`${user}/1.webp`);
  });

  it("never points at anything that isn't theirs to delete", () => {
    expect(ownAvatarPath(null, user)).toBeNull();
    expect(ownAvatarPath("https://lh3.googleusercontent.com/a/photo", user)).toBeNull();
    expect(ownAvatarPath(`${base}/someone-else/1.webp`, user)).toBeNull();
    expect(ownAvatarPath(`${base}/${user}/../someone-else/1.webp`, user)).toBeNull();
    expect(ownAvatarPath(`${base}/${user}/`, user)).toBeNull();
  });
});
