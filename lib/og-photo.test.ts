// @vitest-environment node
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { drawablePhoto, drawableType, isTrustedPhoto, photoHosts } from "./og-photo";

const hosts = photoHosts("https://abc.supabase.co/");
const OWN = "https://abc.supabase.co/storage/v1/object/public/avatars/user-1/1.webp";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

afterEach(() => vi.unstubAllGlobals());

describe("isTrustedPhoto", () => {
  it("only trusts the app's own photo homes", () => {
    expect(isTrustedPhoto(OWN, hosts)).toBe(true);
    expect(isTrustedPhoto("https://lh3.googleusercontent.com/a/photo", hosts)).toBe(true);
    for (const url of [
      "http://169.254.169.254/latest/meta-data",
      "https://abc.supabase.co/rest/v1/profiles",
      "https://other.supabase.co/storage/v1/object/public/avatars/x.png",
      "https://abc.supabase.co/storage/v1/object/public/avatars/../../rest/v1/items",
      "https://lh3.googleusercontent.com.evil.example/a.png",
    ]) {
      expect(isTrustedPhoto(url, hosts), url).toBe(false);
    }
  });
});

describe("drawableType", () => {
  it("knows what Satori can draw from the first bytes", () => {
    expect(drawableType(PNG)).toBe("image/png");
    expect(drawableType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(drawableType(WEBP)).toBeNull();
  });
});

describe("drawablePhoto", () => {
  it("hands back a data URL for a PNG from a trusted home", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(PNG)));
    expect(await drawablePhoto(OWN, hosts)).toMatch(/^data:image\/png;base64,/);
  });

  it("redraws an uploaded WebP photo as a small PNG Satori can read", async () => {
    const webp = await sharp({ create: { width: 600, height: 400, channels: 3, background: "#f4b650" } }).webp().toBuffer();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(webp))));
    const url = await drawablePhoto(OWN, hosts);
    expect(url).toMatch(/^data:image\/png;base64,/);
    const png = Buffer.from(url?.split(",")[1] ?? "", "base64");
    expect(await sharp(png).metadata()).toMatchObject({ format: "png", width: 256, height: 256 });
  });

  it("gives up quietly on unreadable files, errors and strangers' addresses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(WEBP)));
    expect(await drawablePhoto(OWN, hosts)).toBeNull();

    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    expect(await drawablePhoto(OWN, hosts)).toBeNull();

    const never = vi.fn();
    vi.stubGlobal("fetch", never);
    expect(await drawablePhoto("http://10.0.0.1/admin.png", hosts)).toBeNull();
    expect(never).not.toHaveBeenCalled();
  });
});
