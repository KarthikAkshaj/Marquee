import { describe, expect, it } from "vitest";
import { STAGGER_LIMIT, rise } from "./motion";

describe("rise", () => {
  it("staggers the first 24 grid items 30ms apart and leaves the rest still", () => {
    expect(rise(0)).toEqual({ className: "animate-rise", style: { animationDelay: "0ms" } });
    expect(rise(5).style).toEqual({ animationDelay: "150ms" });
    expect(rise(STAGGER_LIMIT - 1).style).toEqual({ animationDelay: "690ms" });
    expect(rise(STAGGER_LIMIT)).toEqual({});
  });
});
