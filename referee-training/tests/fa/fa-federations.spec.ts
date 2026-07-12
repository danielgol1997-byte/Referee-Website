/**
 * Developer-only hierarchy builder (/super-admin?tab=federations).
 *
 * Full lifecycle through the real UI: create an association, add / rename /
 * reorder / delete ranks, manage international categories, delete the
 * association. Runs as the DEVELOPER fixture user — hierarchy mutations are
 * closed to every other role.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { apiAs, statePath, PW } from "./helpers";

test.use({ storageState: statePath("dev") });

const TEMP_FA = "PWFA UI Temp FA";
const TEMP_INTL = "PWFA UI Temp Intl";

let devApi: APIRequestContext;

async function removeTempFa() {
  const res = await devApi.get("/api/admin/associations");
  const { associations } = await res.json();
  for (const a of associations as Array<{ id: string; name: string }>) {
    if (a.name.startsWith(TEMP_FA) || a.name.startsWith(TEMP_INTL)) {
      await devApi.delete(`/api/admin/associations/${a.id}`);
    }
  }
}

test.beforeAll(async ({ playwright }) => {
  devApi = await apiAs(playwright, "dev");
  await removeTempFa();
});

test.afterAll(async () => {
  await removeTempFa();
  await devApi.dispose();
});

test.describe.serial("federations hierarchy builder", () => {
  test("panel lists national associations and international federations", async ({ page }) => {
    await page.goto("/super-admin?tab=federations");
    await expect(page.getByRole("heading", { name: "Federations" })).toBeVisible();
    await expect(page.getByText("National associations")).toBeVisible();
    await expect(page.getByText("International federations")).toBeVisible();
    await expect(page.getByText(PW.fas.alpha)).toBeVisible();
    await expect(page.getByText(PW.fas.beta)).toBeVisible();
    await expect(page.getByText(PW.fas.intl)).toBeVisible();

    // An international federation holds its own categories.
    await page.getByText(PW.fas.intl).click();
    await expect(page.getByText(`Categories — ${PW.fas.intl}`)).toBeVisible();
    await expect(page.getByText(PW.ranks.intlElite)).toBeVisible();
    await expect(page.getByText(PW.ranks.intlFirst)).toBeVisible();
  });

  test("creates an international federation with the toggle", async ({ page }) => {
    await page.goto("/super-admin?tab=federations");
    await expect(page.getByRole("heading", { name: "Federations" })).toBeVisible();

    // Flip to the international segment: the placeholder changes and the
    // flag picker disappears.
    await page.getByRole("radio", { name: "International" }).click();
    const input = page.getByPlaceholder("New federation (e.g. UEFA)");
    await input.fill(TEMP_INTL);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(TEMP_INTL)).toBeVisible();

    // It lands in the international section and takes categories.
    await page.getByText(TEMP_INTL).click();
    await expect(page.getByText(`Categories — ${TEMP_INTL}`)).toBeVisible();
    await expect(page.getByText("No categories yet", { exact: false })).toBeVisible();

    const categoryInput = page.getByPlaceholder("New category (e.g. Elite)");
    await categoryInput.fill("PWFA UI Temp Elite");
    await page.getByRole("button", { name: "Add", exact: true }).nth(1).click();
    await expect(page.getByText("PWFA UI Temp Elite")).toBeVisible();

    // Verify server-side flag, then clean up.
    const { associations } = await (await devApi.get("/api/admin/associations")).json();
    const fed = (associations as Array<{ id: string; name: string; isInternational: boolean }>).find(
      (a) => a.name === TEMP_INTL
    );
    expect(fed?.isInternational).toBe(true);
    await devApi.delete(`/api/admin/associations/${fed!.id}`);
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
    const rankTwoRow = page.getByTestId("rank-row").filter({ hasText: "PWFA UI Rank Two" });
    await rankTwoRow.getByRole("button", { name: "Move up" }).click();
    await expect
      .poll(async () => {
        const res = await devApi.get("/api/admin/associations");
        const { associations } = await res.json();
        const fa = (associations as Array<{ id: string; name: string }>).find(
          (a) => a.name === TEMP_FA
        );
        if (!fa) return [];
        const ranks = await (
          await devApi.get(`/api/admin/ranks?associationId=${fa.id}`)
        ).json();
        return ranks.ranks.map((r: { name: string }) => r.name);
      })
      .toEqual(["PWFA UI Rank Two", "PWFA UI Rank One"]);

    // Rename Rank One.
    const rankOneRow = page.getByTestId("rank-row").filter({ hasText: "PWFA UI Rank One" });
    await rankOneRow.getByRole("button", { name: "Rename" }).click();
    const editInput = page.locator('input[value="PWFA UI Rank One"]');
    await editInput.fill("PWFA UI Rank Renamed");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("PWFA UI Rank Renamed")).toBeVisible();

    // Delete both ranks.
    for (const rank of ["PWFA UI Rank Two", "PWFA UI Rank Renamed"]) {
      const row = page.getByTestId("rank-row").filter({ hasText: rank });
      await row.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText(rank)).toBeHidden();
    }
    await expect(page.getByText("No ranks yet")).toBeVisible();

    // Delete the association itself (no members, so this succeeds).
    const faRow = page.getByTestId("fa-row").filter({ hasText: TEMP_FA });
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
