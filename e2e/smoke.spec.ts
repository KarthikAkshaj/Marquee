import { expect, test } from "@playwright/test";

test("landing page invites you in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Marquee" })).toBeVisible();
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("signed-out visitors are bounced from the app to login", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Let's get you in." })).toBeVisible();
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
