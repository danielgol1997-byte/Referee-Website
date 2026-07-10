/**
 * Stats page federation division (mock data is keyed by FA country code):
 *  - super admins see all referees + a federation filter
 *  - FA admins are locked to their own federation (PWFA FAs use country codes
 *    with no mock referees, so their view must be empty of foreign referees)
 *  - referees are locked to their own page
 */
import { test, expect } from "@playwright/test";
import { readFixtureIds, statePath, PW } from "./helpers";

// A mock referee from Denmark — outside every PWFA federation.
const FOREIGN_REFEREE = { id: "lars-andersen", name: "Lars Andersen" };

test.describe("stats — super admin", () => {
  test.use({ storageState: statePath("super") });

  test("sees every referee and a federation filter", async ({ page }) => {
    await page.goto("/stats?tab=referees");
    await expect(page.getByRole("button", { name: "All federations" })).toBeVisible();
    await expect(page.getByText(FOREIGN_REFEREE.name)).toBeVisible();
  });

  test("filtering by a federation narrows the list", async ({ page }) => {
    const ids = readFixtureIds();
    await page.goto(`/stats?tab=referees&fa=${ids.alphaFaId}`);
    // Alpha FA has no mock referees, so foreign referees must disappear.
    await expect(page.getByText(FOREIGN_REFEREE.name)).toBeHidden();
    await expect(page.getByRole("button", { name: PW.fas.alpha })).toBeVisible();
  });

  test("can open any referee's page", async ({ page }) => {
    await page.goto(`/stats/referee/${FOREIGN_REFEREE.id}`);
    await expect(page.getByText(FOREIGN_REFEREE.name).first()).toBeVisible();
  });
});

test.describe("stats — FA admin is locked to their federation", () => {
  test.use({ storageState: statePath("adminAlpha") });

  test("sees their federation label instead of a filter, and no foreign referees", async ({
    page,
  }) => {
    await page.goto("/stats?tab=referees");
    await expect(page.getByText(`Federation: ${PW.fas.alpha}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "All federations" })).toBeHidden();
    await expect(page.getByText(FOREIGN_REFEREE.name)).toBeHidden();
  });

  test("cannot open a referee page outside their federation", async ({ page }) => {
    await page.goto(`/stats/referee/${FOREIGN_REFEREE.id}`);
    await page.waitForURL(
      (url) => !new URL(url).pathname.includes(FOREIGN_REFEREE.id),
      { timeout: 20000 }
    );
  });

  test("cannot open a category drill-down for a foreign referee", async ({ page }) => {
    await page.goto(`/stats/referee/${FOREIGN_REFEREE.id}/category/offside`);
    await page.waitForURL(
      (url) => !new URL(url).pathname.includes(FOREIGN_REFEREE.id),
      { timeout: 20000 }
    );
  });
});

test.describe("stats — referees only see themselves", () => {
  test.use({ storageState: statePath("refAlpha") });

  test("the stats index redirects to their own page", async ({ page }) => {
    await page.goto("/stats");
    await page.waitForURL("**/stats/referee/**", { timeout: 20000 });
  });
});
