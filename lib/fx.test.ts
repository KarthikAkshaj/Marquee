import { describe, expect, it } from "vitest";
import { fxTier, type FxSignals } from "@/lib/fx";

const flagship: FxSignals = { reducedMotion: false, reducedTransparency: false, saveData: false, deviceMemory: 8, cores: 8 };

describe("fxTier", () => {
  it("gives a capable device the full show", () => {
    expect(fxTier(flagship)).toBe("full");
  });

  it("steps down for anyone who asked for less", () => {
    expect(fxTier({ ...flagship, reducedMotion: true })).toBe("lite");
    expect(fxTier({ ...flagship, reducedTransparency: true })).toBe("lite");
    expect(fxTier({ ...flagship, saveData: true })).toBe("lite");
  });

  it("steps down for a device short on memory or cores", () => {
    expect(fxTier({ ...flagship, deviceMemory: 4 })).toBe("lite");
    expect(fxTier({ ...flagship, cores: 2 })).toBe("lite");
  });

  it("never holds an unknown against a device, so Safari gets the full show", () => {
    expect(fxTier({ ...flagship, deviceMemory: undefined, cores: 4 })).toBe("full");
    expect(fxTier({ ...flagship, deviceMemory: undefined, cores: undefined })).toBe("full");
  });
});
