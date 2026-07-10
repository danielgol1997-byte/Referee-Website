/**
 * Referee registration + onboarding flow.
 *
 * register → auto sign-in → forced onto /onboarding → complete the profile
 * (country, FA, DOB, height, weight) → FA becomes locked and only an admin
 * can move it afterwards.
 *
 * The whole flow runs in one shared browser context so the session created
 * at registration carries through every step (like a real user).
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { loadEnv, readFixtureIds, PW, BASE_URL } from "./helpers";

loadEnv();
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { prisma } from "../../lib/prisma";

const EMAIL = `pwfa-onboard-${Date.now()}@test.local`;
const PASSWORD = "PwfaOnboard123!";

let context: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  page = await context.newPage();
});

test.afterAll(async () => {
  await context?.close();
  // Remove only the throwaway accounts this spec registers.
  await prisma.user.deleteMany({ where: { email: { startsWith: "pwfa-onboard-" } } });
});

test.describe.serial("registration and onboarding", () => {
  test("register auto-signs-in and lands on onboarding", async () => {
    await page.goto(`${BASE_URL}/auth/register`);
    await page.getByPlaceholder("Alex Referee").fill("PWFA Onboarding Referee");
    await page.getByPlaceholder("you@example.com").fill(EMAIL);
    await page.getByPlaceholder("Create a strong password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL("**/onboarding", { timeout: 20000 });
    await expect(page.getByText("Complete your profile")).toBeVisible();

    // The onboarding form must offer associations but never a rank field
    // (the description "Your association's admin sets your rank." is fine).
    await expect(page.getByText("Football association")).toBeVisible();
    await expect(page.locator("form label", { hasText: /rank/i })).toHaveCount(0);
  });

  test("incomplete profiles are forced back to onboarding", async () => {
    await page.goto(`${BASE_URL}/stats`);
    await page.waitForURL("**/onboarding", { timeout: 20000 });
  });

  test("completing the profile stores everything and redirects home", async () => {
    await page.goto(`${BASE_URL}/onboarding`);
    await expect(page.getByText("Complete your profile")).toBeVisible();

    // Country picker (searchable dropdown with flags).
    await page.getByRole("button", { name: "Select country" }).click();
    await page.getByPlaceholder("Search countries...").fill("Israel");
    await page.getByRole("button", { name: /Israel$/ }).click();

    // Association dropdown.
    await page.getByRole("button", { name: "Select your association" }).click();
    await page.getByRole("button", { name: new RegExp(PW.fas.alpha) }).click();

    // Physical profile.
    await page.locator('input[type="date"]').fill("1995-05-05");
    await page.getByPlaceholder("180").fill("183");
    await page.getByPlaceholder("75").fill("78");

    await page.getByRole("button", { name: "Finish setup" }).click();
    await page.waitForURL((url) => new URL(url).pathname === "/", { timeout: 20000 });

    // Verify persisted values through the profile API (same session).
    const res = await page.request.get(`${BASE_URL}/api/users/me/profile`);
    expect(res.status()).toBe(200);
    const { user } = await res.json();
    expect(user.association?.name).toBe(PW.fas.alpha);
    expect(user.country).toBe("Israel");
    expect(user.dateOfBirth).toContain("1995-05-05");
    expect(user.heightCm).toBe(183);
    expect(user.weightKg).toBe(78);
    expect(user.profileComplete).toBe(true);
    // Rank is never self-assigned during onboarding.
    expect(user.rank).toBeNull();
    expect(user.internationalRank).toBeNull();
  });

  test("the FA is locked after onboarding", async () => {
    const ids = readFixtureIds();

    // The account page shows the FA as admin-managed, not editable.
    await page.goto(`${BASE_URL}/account`);
    await expect(page.getByText("Managed by your association")).toBeVisible();
    await expect(page.getByText(PW.fas.alpha)).toBeVisible();

    // And the API silently ignores attempts to switch FA.
    const res = await page.request.put(`${BASE_URL}/api/users/me/profile`, {
      data: {
        name: "PWFA Onboarding Referee",
        country: "Israel",
        associationId: ids.betaFaId,
      },
    });
    expect(res.status()).toBe(200);
    const { user } = await res.json();
    expect(user.association?.name).toBe(PW.fas.alpha);
  });

  test("duplicate registration is rejected", async () => {
    const res = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: { name: "Dup", email: EMAIL, password: PASSWORD },
    });
    expect(res.status()).toBe(400);
    const { error } = await res.json();
    expect(error).toMatch(/exists/i);
  });
});
