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

test("email code button only wakes up for a valid email", async ({ page }) => {
  await page.goto("/login");
  const send = page.getByRole("button", { name: "Email me a code" });
  await expect(send).toBeDisabled();
  await page.getByLabel("Email").fill("not-an-email");
  await expect(send).toBeDisabled();
  await page.getByLabel("Email").fill("you@example.com");
  await expect(send).toBeEnabled();
});
