/**
 * Developer-only hierarchy builder (/super-admin?tab=federations).
 *
 * Full lifecycle through the real UI: create an association, add / rename /
 * reorder / delete ranks, manage international categories, delete the
 * association. Runs as the DEVELOPER fixture user — hierarchy mutations are
 * closed to every other role.
 *
 * The panel has two sub-tabs:
 *   1. Add federations  — always-visible create form + existing list
 *   2. Ranks & categories — pick a federation, then edit its ladder
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
    await expect(page.getByRole("tab", { name: /Add federations/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Ranks & categories/i })).toBeVisible();
    await expect(page.getByText("National associations")).toBeVisible();
    await expect(page.getByText("International federations")).toBeVisible();
    await expect(page.getByText(PW.fas.alpha)).toBeVisible();
    await expect(page.getByText(PW.fas.beta)).toBeVisible();
    await expect(page.getByText(PW.fas.intl)).toBeVisible();

    // Jump into the international federation's categories via the list CTA.
    const intlRow = page.getByTestId("fa-row").filter({ hasText: PW.fas.intl });
    await intlRow.getByRole("button", { name: /Categories/i }).click();
    await expect(page.getByText(`Categories · ${PW.fas.intl}`)).toBeVisible();
    await expect(page.getByText(PW.ranks.intlElite)).toBeVisible();
    await expect(page.getByText(PW.ranks.intlFirst)).toBeVisible();
  });

  test("creates an international federation with the toggle", async ({ page }) => {
    await page.goto("/super-admin?tab=federations");
    await expect(page.getByRole("heading", { name: "Federations" })).toBeVisible();

    // Flip to the international card: the placeholder changes and the flag
    // picker disappears.
    await page.getByRole("radio", { name: /International/i }).click();
    const input = page.getByPlaceholder("New federation (e.g. UEFA)");
    await input.fill(TEMP_INTL);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(TEMP_INTL)).toBeVisible();

    // It lands in the international section and takes categories.
    const tempRow = page.getByTestId("fa-row").filter({ hasText: TEMP_INTL });
    await tempRow.getByRole("button", { name: /Categories/i }).click();
    await expect(page.getByText(`Categories · ${TEMP_INTL}`)).toBeVisible();
    await expect(page.getByText("No categories yet", { exact: false })).toBeVisible();

    const categoryInput = page.getByPlaceholder("New category (e.g. Elite)");
    await categoryInput.fill("PWFA UI Temp Elite");
    await page.getByRole("button", { name: "Add", exact: true }).click();
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

    // Create the association on tab 1.
    await page.getByPlaceholder("New association name").fill(TEMP_FA);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(TEMP_FA)).toBeVisible();

    // Open its ranks on tab 2.
    const faRow = page.getByTestId("fa-row").filter({ hasText: TEMP_FA });
    await faRow.getByRole("button", { name: /Ranks/i }).click();
    await expect(page.getByText(`Ranks · ${TEMP_FA}`)).toBeVisible();
    await expect(page.getByText("No ranks yet")).toBeVisible();

    // Add two ranks.
    const rankInput = page.getByPlaceholder("New rank name");
    await rankInput.fill("PWFA UI Rank One");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("PWFA UI Rank One")).toBeVisible();

    await rankInput.fill("PWFA UI Rank Two");
    await page.getByRole("button", { name: "Add", exact: true }).click();
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

    // Back to tab 1 to delete the association itself.
    await page.getByRole("tab", { name: /Add federations/i }).click();
    const deleteRow = page.getByTestId("fa-row").filter({ hasText: TEMP_FA });
    await deleteRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByTestId("fa-row").filter({ hasText: TEMP_FA })).toHaveCount(0);
  });

  test("duplicate association names are rejected with a visible error", async ({ page }) => {
    await page.goto("/super-admin?tab=federations");
    await page.getByPlaceholder("New association name").fill(PW.fas.alpha);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });
});
