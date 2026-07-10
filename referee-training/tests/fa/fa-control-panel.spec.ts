/**
 * Control Panel access (/super-admin) after the dedicated FA admin panel was
 * retired: FA admins manage referees from the same Users tab as super admins,
 * the Federations (hierarchy) tab is developer-only, and /admin redirects.
 */
import { test, expect } from "@playwright/test";
import { apiAs, readFixtureIds, statePath, PW } from "./helpers";

test.describe("Control Panel — FA admin (alpha)", () => {
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

  test("the old /admin URL redirects to the Control Panel", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL((url) => new URL(url).pathname.startsWith("/super-admin"));
    await expect(page.getByText("Control Panel")).toBeVisible();
  });

  test("sees the Users tab but not the developer-only Federations tab", async ({ page }) => {
    await page.goto("/super-admin?tab=users");
    await expect(page.getByRole("columnheader", { name: "Federation / Rank" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Federations", exact: true })).toHaveCount(0);
  });

  test("assigns a rank, an international federation, and a category via the Users tab", async ({
    page,
  }) => {
    const ids = readFixtureIds();
    await page.goto("/super-admin?tab=users");
    await page.getByPlaceholder("Search by name or email").fill("pwfa-ref-alpha");

    const row = page.locator("tr").filter({ hasText: PW.users.refAlpha });
    await expect(row).toHaveCount(1);

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

    // All three stuck server-side (FA admins can read the users API now).
    const res = await page.request.get("/api/admin/users?search=pwfa-ref-alpha");
    expect(res.status()).toBe(200);
    const { users } = await res.json();
    const ref = users.find((u: { id: string }) => u.id === ids.refAlphaId);
    expect(ref.rank?.name).toBe(PW.ranks.alphaElite);
    expect(ref.internationalAssociation?.name).toBe(PW.fas.intl);
    expect(ref.internationalRank?.name).toBe(PW.ranks.intlElite);

    // Rank options never include another FA's ranks.
    await row.getByRole("button", { name: PW.ranks.alphaElite }).click();
    await expect(page.getByRole("button", { name: PW.ranks.betaElite })).toHaveCount(0);
  });

  test("account controls (role, status, profile) are hidden from FA admins", async ({ page }) => {
    await page.goto("/super-admin?tab=users");
    await page.getByPlaceholder("Search by name or email").fill("pwfa-ref-alpha");

    const row = page.locator("tr").filter({ hasText: PW.users.refAlpha });
    await expect(row).toHaveCount(1);
    // Role renders as plain text, and there is no deactivate button.
    await expect(row.getByText("Referee", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: /Deactivate|Activate/ })).toHaveCount(0);
  });
});

test.describe("Control Panel — Federations tab gating", () => {
  test("super admins do not see the Federations tab", async ({ page }) => {
    // The default project storageState is the super admin.
    await page.goto("/super-admin");
    await expect(page.getByRole("link", { name: "Users", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Federations", exact: true })).toHaveCount(0);
  });

  test("developers see and can open the Federations tab", async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath("dev") });
    const page = await context.newPage();
    await page.goto("/super-admin?tab=federations");
    await expect(page.getByRole("link", { name: "Federations", exact: true })).toBeVisible();
    await expect(page.getByText("National associations")).toBeVisible();
    await expect(page.getByText("International federations")).toBeVisible();
    await context.close();
  });
});

test.describe("Control Panel — gating for other roles", () => {
  test("referees are bounced off /super-admin and /admin", async ({ browser }) => {
    const context = await browser.newContext({ storageState: statePath("refAlpha") });
    const page = await context.newPage();
    await page.goto("/super-admin");
    await page.waitForURL((url) => !new URL(url).pathname.startsWith("/super-admin"));
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
    await page.goto("/super-admin");
    await page.waitForURL(/auth\/login/);
    await context.close();
  });
});
