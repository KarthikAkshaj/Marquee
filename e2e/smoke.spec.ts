import { expect, test } from "@playwright/test";

test("landing page invites you in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Marquee" })).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("signed-out visitors can't open a category shelf", async ({ page }) => {
  await page.goto("/c/anime?status=planned");
  await expect(page).toHaveURL(/\/login\?next=%2Fc%2Fanime/);
});

test("signed-out visitors can't open Find covers", async ({ page }) => {
  await page.goto("/c/anime/match");
  await expect(page).toHaveURL(/\/login\?next=%2Fc%2Fanime%2Fmatch/);
});

test("signed-out visitors can't open settings", async ({ page }) => {
  await page.goto("/settings/categories?new=1");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fcategories/);
});

test("signed-out visitors can't open import", async ({ page }) => {
  await page.goto("/import?category=anime");
  await expect(page).toHaveURL(/\/login\?next=%2Fimport/);
});

test("signed-out visitors are bounced from the app to login", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Let's get you in." })).toBeVisible();
});

test("metadata search and the palette's title list need a session", async ({ request }) => {
  const search = await request.get("/api/search?kind=anime&q=frieren");
  expect(search.status()).toBe(401);
  expect(await search.json()).toEqual({ results: [], error: "signed_out" });

  const batch = await request.post("/api/search", { data: { kind: "anime", queries: ["Frieren"] } });
  expect(batch.status()).toBe(401);

  const titles = await request.get("/api/titles");
  expect(titles.status()).toBe(401);
  expect(await titles.json()).toEqual({ titles: [] });
});

test("terms and privacy are public and linked from the landing page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Legal" }).getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your lists are yours." })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1, name: "The fine print, in large print." })).toBeVisible();
});

test("the app can be installed: manifest and icons are public", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const body = await manifest.json();
  expect(body).toMatchObject({ name: "Marquee", start_url: "/home", display: "standalone", theme_color: "#09090B" });
  for (const icon of body.icons as { src: string; sizes: string }[]) {
    const png = await request.get(icon.src);
    expect(png.status(), icon.src).toBe(200);
    expect(png.headers()["content-type"]).toBe("image/png");
  }
});

test("every response carries the security headers", async ({ request }) => {
  for (const path of ["/", "/login"]) {
    const response = await request.get(path);
    const headers = response.headers();
    expect(headers["strict-transport-security"], path).toContain("max-age=");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"], path).toContain("camera=()");
    const policy = headers["content-security-policy"] ?? "";
    expect(policy, path).toContain("frame-ancestors 'none'");
    expect(policy, path).toContain("default-src 'self'");
    expect(policy, path).toContain("object-src 'none'");
  }
  // The page rendered per request gets the stricter, nonce-based script rule.
  const login = await request.get("/login");
  expect(login.headers()["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[a-f0-9]+' 'strict-dynamic'/);
});

test("search engines get the public pages and are kept out of the app", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const rules = await robots.text();
  for (const path of ["/home", "/c/", "/import", "/settings", "/auth/", "/api/"]) expect(rules).toContain(`Disallow: ${path}`);
  expect(rules).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const urls = await sitemap.text();
  for (const path of ["/terms", "/privacy"]) expect(urls).toContain(path);
  expect(urls).not.toContain("/settings");
});

test("email code button only wakes up for a valid email", async ({ page }) => {
  await page.goto("/login");
  const send = page.getByRole("button", { name: "Email me a code" });
  await expect(send).toBeDisabled();
  await page.getByLabel("Email").fill("not-an-email");
  await expect(send).toBeDisabled();
  await page.getByLabel("Email").fill("you@example.com");
  await expect(send).toBeEnabled();
});
