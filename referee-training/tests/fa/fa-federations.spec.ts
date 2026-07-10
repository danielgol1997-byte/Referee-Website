/**
 * Super-admin hierarchy builder (/super-admin?tab=federations).
 *
 * Full lifecycle through the real UI: create an association, add / rename /
 * reorder / delete ranks, manage international panels, delete the association.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { apiAs, statePath, PW } from "./helpers";

test.use({ storageState: statePath("super") });

const TEMP_FA = "PWFA UI Temp FA";

let superApi: APIRequestContext;

async function removeTempFa() {
  const res = await superApi.get("/api/admin/associations");
  const { associations } = await res.json();
  for (const a of associations as Array<{ id: string; name: string }>) {
    if (a.name.startsWith(TEMP_FA)) {
      await superApi.delete(`/api/admin/associations/${a.id}`);
    }
  }
}

test.beforeAll(async ({ playwright }) => {
  superApi = await apiAs(playwright, "super");
  await removeTempFa();
});

test.afterAll(async () => {
  await removeTempFa();
  await superApi.dispose();
});

test.describe.serial("federations hierarchy builder", () => {
  test("panel lists existing associations and international panels", async ({ page }) => {
    await page.goto("/super-admin?tab=federations");
    await expect(page.getByRole("heading", { name: "Federations" })).toBeVisible();
    await expect(page.getByText(PW.fas.alpha)).toBeVisible();
    await expect(page.getByText(PW.fas.beta)).toBeVisible();
    await expect(page.getByText("International panels")).toBeVisible();

    // International panels contain UEFA + FIFA.
    await page.getByText("International panels").click();
    await expect(page.getByText("Ranks — International panels")).toBeVisible();
    await expect(page.getByText("UEFA", { exact: true })).toBeVisible();
    await expect(page.getByText("FIFA", { exact: true })).toBeVisible();
  });

  test("full association + rank lifecycle through the UI", async ({ page }) => {
    await page.goto("/super-admin?tab=federations");
    await expect(page.getByRole("heading", { name: "Federations" })).toBeVisible();

    // Create the association.
    await page.getByPlaceholder("New association name").fill(TEMP_FA);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(TEMP_FA)).toBeVisible();

    // Select it; it has no ranks yet.
    await page.getByText(TEMP_FA).click();
    await expect(page.getByText(`Ranks — ${TEMP_FA}`)).toBeVisible();
    await expect(page.getByText("No ranks yet")).toBeVisible();

    // Add two ranks.
    const rankInput = page.getByPlaceholder("New rank name");
    await rankInput.fill("PWFA UI Rank One");
    await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
    await expect(page.getByText("PWFA UI Rank One")).toBeVisible();

    await rankInput.fill("PWFA UI Rank Two");
    await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
    await expect(page.getByText("PWFA UI Rank Two")).toBeVisible();

    // Reorder: move Rank Two above Rank One.
    const rankTwoRow = page
      .locator("div")
      .filter({ hasText: /^▲▼PWFA UI Rank Two/ })
      .last();
    await rankTwoRow.getByRole("button", { name: "Move up" }).click();
    await expect
      .poll(async () => {
        const res = await superApi.get("/api/admin/associations");
        const { associations } = await res.json();
        const fa = (associations as Array<{ id: string; name: string }>).find(
          (a) => a.name === TEMP_FA
        );
        if (!fa) return [];
        const ranks = await (
          await superApi.get(`/api/admin/ranks?associationId=${fa.id}`)
        ).json();
        return ranks.ranks.map((r: { name: string }) => r.name);
      })
      .toEqual(["PWFA UI Rank Two", "PWFA UI Rank One"]);

    // Rename Rank One.
    const rankOneRow = page
      .locator("div")
      .filter({ hasText: /^▲▼PWFA UI Rank One/ })
      .last();
    await rankOneRow.getByRole("button", { name: "Rename" }).click();
    const editInput = page.locator('input[value="PWFA UI Rank One"]');
    await editInput.fill("PWFA UI Rank Renamed");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("PWFA UI Rank Renamed")).toBeVisible();

    // Delete both ranks.
    for (const rank of ["PWFA UI Rank Two", "PWFA UI Rank Renamed"]) {
      const row = page
        .locator("div")
        .filter({ hasText: new RegExp(`^▲▼${rank}`) })
        .last();
      await row.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText(rank)).toBeHidden();
    }
    await expect(page.getByText("No ranks yet")).toBeVisible();

    // Delete the association itself (no members, so this succeeds).
    const faRow = page.locator("div").filter({ hasText: new RegExp(`^🏳️${TEMP_FA}`) }).last();
    await faRow.getByRole("button", { name: "Delete" }).click();
    // The row (a select button named after the FA) must disappear from the list.
    await expect(page.getByRole("button", { name: new RegExp(TEMP_FA) })).toHaveCount(0);
  });

  test("duplicate association names are rejected with a visible error", async ({ page }) => {
    await page.goto("/super-admin?tab=federations");
    await page.getByPlaceholder("New association name").fill(PW.fas.alpha);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });
});
