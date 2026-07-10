/**
 * Super-admin user management with federation capabilities:
 * federation column + filter in the UI, moving referees between FAs
 * (which resets their rank), and the users API scoping.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { apiAs, readFixtureIds, statePath, PW, type FixtureIds } from "./helpers";

test.use({ storageState: statePath("super") });

let superApi: APIRequestContext;
let ids: FixtureIds;

test.beforeAll(async ({ playwright }) => {
  superApi = await apiAs(playwright, "super");
  ids = readFixtureIds();
});

test.afterAll(async () => {
  // Restore the fixture referee to their original FA, unranked.
  await superApi.patch(`/api/admin/users/${ids.refAlphaId}`, {
    data: {
      associationId: ids.alphaFaId,
      rankId: null,
      internationalAssociationId: null,
      internationalRankId: null,
    },
  });
  await superApi.dispose();
});

test.describe.serial("super-admin user management", () => {
  test("users API is super-admin only and returns federation info", async ({ playwright }) => {
    const res = await superApi.get("/api/admin/users?search=pwfa-ref-alpha");
    expect(res.status()).toBe(200);
    const { users } = await res.json();
    const ref = users.find((u: { email: string }) => u.email === PW.users.refAlpha);
    expect(ref).toBeTruthy();
    expect(ref.association?.name).toBe(PW.fas.alpha);

    const adminCtx = await apiAs(playwright, "adminAlpha");
    expect((await adminCtx.get("/api/admin/users")).status()).toBe(401);
    await adminCtx.dispose();
  });

  test("users API filters by federation and unassigned", async () => {
    const alphaOnly = await (
      await superApi.get(`/api/admin/users?associationId=${ids.alphaFaId}`)
    ).json();
    for (const u of alphaOnly.users) expect(u.associationId).toBe(ids.alphaFaId);

    const unassigned = await (
      await superApi.get("/api/admin/users?associationId=none&search=pwfa-")
    ).json();
    for (const u of unassigned.users) expect(u.associationId).toBeNull();
    expect(unassigned.users.map((u: { email: string }) => u.email)).toContain(
      PW.users.refNoFa
    );
  });

  test("moving a referee to another FA resets their rank", async () => {
    // Give the alpha referee a rank first.
    const ranked = await superApi.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { rankId: ids.alphaEliteRankId },
    });
    expect(ranked.status()).toBe(200);
    expect((await ranked.json()).user.rank?.name).toBe(PW.ranks.alphaElite);

    // Move them to Beta FA.
    const moved = await superApi.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { associationId: ids.betaFaId },
    });
    expect(moved.status()).toBe(200);
    const { user } = await moved.json();
    expect(user.association?.name).toBe(PW.fas.beta);
    expect(user.rank).toBeNull(); // rank belongs to the old FA → reset

    // Now a beta rank is assignable, an alpha rank is not.
    expect(
      (
        await superApi.patch(`/api/admin/users/${ids.refAlphaId}`, {
          data: { rankId: ids.alphaEliteRankId },
        })
      ).status()
    ).toBe(400);
    const betaRanked = await superApi.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { rankId: ids.betaEliteRankId },
    });
    expect(betaRanked.status()).toBe(200);

    // Move back home (afterAll also does this; keep the test self-contained).
    const back = await superApi.patch(`/api/admin/users/${ids.refAlphaId}`, {
      data: { associationId: ids.alphaFaId },
    });
    expect((await back.json()).user.rank).toBeNull();
  });

  test("users tab shows a Federation column with a working filter", async ({ page }) => {
    await page.goto("/super-admin?tab=users");
    await expect(page.getByRole("columnheader", { name: "Federation" })).toBeVisible();

    // Filter down to Alpha FA members only.
    await page.getByRole("button", { name: "All federations" }).click();
    await page.getByRole("button", { name: PW.fas.alpha, exact: true }).click();
    await expect(page.getByText(PW.users.refAlpha)).toBeVisible();
    await expect(page.getByText(PW.users.refBeta)).toBeHidden();
  });
});
