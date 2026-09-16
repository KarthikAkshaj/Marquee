import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("treats custom text sizes as sizes, not colours", () => {
    // Regression: the magic-link button lost its dark ink this way.
    expect(cn("text-accent-ink text-[13.5px]", "text-14")).toBe("text-accent-ink text-14");
  });

  it("lets a later custom size replace an earlier one", () => {
    expect(cn("text-12 text-text-muted", "text-16")).toBe("text-text-muted text-16");
  });

  it("merges custom radii and shadows with each other", () => {
    expect(cn("rounded-card", "rounded-sheet")).toBe("rounded-sheet");
    expect(cn("shadow-cta-md", "shadow-cta-sm")).toBe("shadow-cta-sm");
  });

  it("keeps a shadow and a disabled override side by side", () => {
    expect(cn("shadow-cta-md disabled:shadow-none")).toBe("shadow-cta-md disabled:shadow-none");
  });
});
