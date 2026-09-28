import { describe, expect, it } from "vitest";
import { WELCOME_COOKIE, hasWelcome, signInCallback } from "./welcome";

describe("welcome on arrival", () => {
  it("sends sign-ins back through the callback with the welcome flag", () => {
    expect(signInCallback("https://marquee.example", "/c/anime?view=grid")).toBe(
      "https://marquee.example/auth/callback?next=%2Fc%2Fanime%3Fview%3Dgrid&welcome=1",
    );
  });

  it("finds the cookie among others, and only when it's set", () => {
    expect(hasWelcome(`a=1; ${WELCOME_COOKIE}=1; b=2`)).toBe(true);
    expect(hasWelcome(`${WELCOME_COOKIE}=1`)).toBe(true);
    expect(hasWelcome(`${WELCOME_COOKIE}=`)).toBe(false);
    expect(hasWelcome(`x${WELCOME_COOKIE}=1`)).toBe(false);
    expect(hasWelcome("")).toBe(false);
  });
});
