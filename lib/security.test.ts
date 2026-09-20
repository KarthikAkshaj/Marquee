// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { noncePolicy, staticPolicy } from "./security";

const directive = (policy: string, name: string) =>
  policy
    .split("; ")
    .find((part) => part.startsWith(`${name} `) || part === name);

describe("content security policy", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lets only Next's own nonced scripts run on a page rendered per request", () => {
    vi.stubEnv("NODE_ENV", "production");
    const policy = noncePolicy("abc123");
    expect(directive(policy, "script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("falls back to inline scripts from this origin on a prerendered page", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(directive(staticPolicy(), "script-src")).toBe("script-src 'self' 'unsafe-inline'");
  });

  it("refuses framing, other origins and stray plugins either way", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const policy of [noncePolicy("abc123"), staticPolicy()]) {
      expect(directive(policy, "frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(directive(policy, "default-src")).toBe("default-src 'self'");
      expect(directive(policy, "object-src")).toBe("object-src 'none'");
      expect(directive(policy, "base-uri")).toBe("base-uri 'self'");
      expect(directive(policy, "form-action")).toBe("form-action 'self'");
      expect(policy).toContain("upgrade-insecure-requests");
    }
  });

  it("allows the cover art hosts, avatars, Supabase and the captcha, and nothing else", () => {
    vi.stubEnv("NODE_ENV", "production");
    const policy = staticPolicy();
    for (const host of ["https://image.tmdb.org", "https://s4.anilist.co", "https://images.igdb.com", "https://*.supabase.co", "https://lh3.googleusercontent.com"]) {
      expect(directive(policy, "img-src")).toContain(host);
    }
    expect(directive(policy, "frame-src")).toBe("frame-src https://hcaptcha.com https://*.hcaptcha.com");
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' https://*.supabase.co https://hcaptcha.com https://*.hcaptcha.com");
  });

  it("loosens up for the dev server's hot reload, and only there", () => {
    vi.stubEnv("NODE_ENV", "development");
    const policy = noncePolicy("abc123");
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "connect-src")).toContain("ws:");
    // Locally the site is plain http, so upgrading every request would break it.
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});
