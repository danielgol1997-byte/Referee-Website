/**
 * FA admin panel (/admin): referee management UI + role gating.
 */
import { test, expect } from "@playwright/test";
import { apiAs, readFixtureIds, statePath, PW } from "./helpers";

test.describe("FA admin panel — alpha admin", () => {
  test.use({ storageState: statePath("adminAlpha") });

  test.afterAll(async ({ playwright }) => {
    // Reset the fixture referee so reruns start clean.
    const superApi = await apiAs(playwright, "super");
    const ids = readFixtureIds();
    await superApi.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { rankId: null, internationalAssociationId: null, internationalRankId: null },
    });
    await superApi.dispose();
  });

  test("shows the admin's own federation in the header", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("FA Admin")).toBeVisible();
    await expect(page.getByText(PW.fas.alpha)).toBeVisible();
  });

  test("lists only own-FA referees", async ({ page }) => {
    await page.goto("/admin?tab=referees");
    await expect(page.getByText(PW.users.refAlpha)).toBeVisible();
    await expect(page.getByText(PW.users.refBeta)).toBeHidden();
    await expect(page.getByText(PW.users.refNoFa)).toBeHidden();
  });

  test("search filters the referee list", async ({ page }) => {
    await page.goto("/admin?tab=referees");
    await expect(page.getByText(PW.users.refAlpha)).toBeVisible();
    await page.getByPlaceholder("Search by name or email").fill("no-such-referee-xyz");
    await expect(page.getByText("No referees in your federation yet.")).toBeVisible();
    await page.getByPlaceholder("Search by name or email").fill("pwfa-ref-alpha");
    await expect(page.getByText(PW.users.refAlpha)).toBeVisible();
  });

  test("assigns a rank, an international federation, and a category through the UI", async ({
    page,
  }) => {
    const ids = readFixtureIds();
    await page.goto("/admin?tab=referees");

    const row = page
      .locator("div")
      .filter({ hasText: PW.users.refAlpha })
      .filter({ has: page.getByRole("button", { name: /Unranked|PWFA/ }) })
      .last();

    // Assign the FA rank.
    await row.getByRole("button", { name: "Unranked" }).click();
    await page.getByRole("button", { name: PW.ranks.alphaElite }).click();
    await expect(row.getByRole("button", { name: PW.ranks.alphaElite })).toBeVisible();

    // Assign the international federation...
    await row.getByRole("button", { name: "None", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(PW.fas.intl) }).click();
    await expect(row.getByRole("button", { name: new RegExp(PW.fas.intl) })).toBeVisible();

    // ...then a category inside it.
    await row.getByRole("button", { name: "No category" }).click();
    await page.getByRole("button", { name: PW.ranks.intlElite }).click();
    await expect(row.getByRole("button", { name: PW.ranks.intlElite })).toBeVisible();

    // All three stuck server-side.
    const res = await page.request.get("/api/admin/referees?search=pwfa-ref-alpha");
    const { referees } = await res.json();
    const ref = referees.find((r: { id: string }) => r.id === ids.refAlphaId);
    expect(ref.rank?.name).toBe(PW.ranks.alphaElite);
    expect(ref.internationalAssociation?.name).toBe(PW.fas.intl);
    expect(ref.internationalRank?.name).toBe(PW.ranks.intlElite);

    // Rank options never include another FA's ranks.
    await row.getByRole("button", { name: PW.ranks.alphaElite }).click();
    await expect(page.getByRole("button", { name: PW.ranks.betaElite })).toHaveCount(0);
  });

  test("FA admins cannot open the super-admin panel", async ({ page }) => {
    await page.goto("/super-admin");
    await page.waitForURL((url) => !new URL(url).pathname.startsWith("/super-admin"));
  });
});

test.describe("FA admin panel — gating for other roles", () => {
  test("referees are bounced off /admin", async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath("refAlpha") });
    const page = await context.newPage();
    await page.goto("/admin");
    await page.waitForURL((url) => !new URL(url).pathname.startsWith("/admin"));
    await context.close();
  });

  test("anonymous visitors are sent to login", async ({ browser }) => {
    // Explicit empty state — newContext() inherits the project's super-admin
    // storageState otherwise.
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto("/admin");
    await page.waitForURL(/auth\/login/);
    await context.close();
  });

  test("admin without an FA sees an empty referee list, not other FAs' data", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: statePath("adminNoFa") });
    const page = await context.newPage();
    await page.goto("/admin?tab=referees");
    await expect(page.getByText("No referees in your federation yet.")).toBeVisible();
    await context.close();
  });
});
