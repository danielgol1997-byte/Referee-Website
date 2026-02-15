import { expect, test } from "@playwright/test";

/**
 * End-to-end tests for the updated locked-sequence video test workflow.
 */

test.describe("Video test runner – full workflow", () => {
  let createdTestId: string;
  let createdTestName: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "playwright/.auth/user.json",
    });
    const page = await context.newPage();

    await page.goto("/super-admin?tab=referee");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Create test" }).click();
    await expect(
      page.getByRole("heading", { name: "Create video test" })
    ).toBeVisible({ timeout: 10000 });

    createdTestName = `PW Runner ${Date.now()}`;
    await page.getByPlaceholder("Test name").fill(createdTestName);

    await page.getByRole("button", { name: "Continue to clip selection" }).click();
    await expect(page.getByText(/Matching clips:/)).toBeVisible({ timeout: 20000 });

    const allStatusBtn = page.getByRole("button", { name: "All Status" }).first();
    await allStatusBtn.click();
    await expect(allStatusBtn).toHaveClass(/bg-accent/);
    await page.waitForTimeout(1000);
    await expect(page.getByText("Matching clips: 0")).toHaveCount(0);

    const createResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().endsWith("/api/admin/video-tests") &&
        resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create video test" }).click();
    const createResponse = await createResponsePromise;
    const createPayload = await createResponse.json().catch(() => ({}));
    expect(createResponse.ok(), `Create failed: ${JSON.stringify(createPayload)}`).toBeTruthy();
    createdTestId = createPayload?.test?.id;
    expect(createdTestId, "Missing test id from create").toBeTruthy();

    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!createdTestId) return;
    const context = await browser.newContext({
      storageState: "playwright/.auth/user.json",
    });
    const page = await context.newPage();

    await page.goto("/super-admin?tab=referee");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("button", { name: "Manage tests" }).click();
    await page.waitForTimeout(1500);

    const card = page.locator(`#admin-manage-test-${createdTestId}`);
    if ((await card.count()) > 0) {
      const deleteResponsePromise = page.waitForResponse(
        (resp) =>
          /\/api\/admin\/video-tests\/[^/]+$/.test(new URL(resp.url()).pathname) &&
          resp.request().method() === "DELETE"
      );
      await card.getByRole("button", { name: "Delete" }).click();
      await expect(page.getByRole("heading", { name: "Delete Video Test" })).toBeVisible({ timeout: 5000 });
      await page.getByRole("button", { name: "Confirm" }).click();
      await deleteResponsePromise;
      const okBtn = page.getByRole("button", { name: "OK" });
      if ((await okBtn.count()) > 0) await okBtn.click();
    }

    await context.close();
  });

  test("full workflow: countdown autoplay, locked answer-next flow, submit on last clip, results render", async ({
    page,
  }) => {
    await page.goto("/practice");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/Public Tests|Available|My Tests/i).first()).toBeVisible({ timeout: 15000 });

    const testCard = page.getByText(createdTestName).first();
    await expect(testCard).toBeVisible({ timeout: 15000 });

    const startResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/tests/videos/start") &&
        resp.request().method() === "POST"
    );
    await page.locator("button", { hasText: "Start test" }).first().click();
    const startResponse = await startResponsePromise;
    const startPayload = await startResponse.json().catch(() => ({}));
    expect(startResponse.ok(), `Start failed: ${JSON.stringify(startPayload)}`).toBeTruthy();
    const sessionId = startPayload?.session?.id;
    expect(sessionId, "Missing session id").toBeTruthy();

    // ─── Verify video test runner page ───
    await page.waitForURL(`**/practice/video-tests/${sessionId}`, { timeout: 15000 });
    await expect(page.getByText(/Video \d+ \/ \d+/)).toBeVisible({ timeout: 15000 });

    // New runner has no manual play/pause/arrow navigation.
    await expect(page.getByRole("button", { name: "Play clip" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
    await expect(page.locator("button[title='Previous clip']")).toHaveCount(0);
    await expect(page.locator("button[title='Next clip']")).toHaveCount(0);

    // No standalone submit button in runner body anymore.
    await expect(page.getByText("Submit Test")).toHaveCount(0);

    // Countdown appears at clip start.
    await expect(page.getByText(/3|2|1/).first()).toBeVisible({ timeout: 6000 });

    const videoHeader = await page.getByText(/Video \d+ \/ \d+/).first().textContent();
    const totalClips = parseInt(videoHeader?.match(/\/\s*(\d+)/)?.[1] ?? "0", 10);
    expect(totalClips).toBeGreaterThan(0);

    let submitResponsePromise: ReturnType<typeof page.waitForResponse> | null = null;
    for (let i = 0; i < totalClips; i++) {
      await expect(page.getByText(`Video ${i + 1}`, { exact: false })).toBeVisible();

      await page.getByRole("button", { name: "Answer question" }).click();
      await expect(page.getByRole("heading", { name: "Your answer" })).toBeVisible({ timeout: 5000 });

      // Quick complete answer path: choose Play on / No offence, then Next/Submit.
      await page.getByRole("button", { name: /Play on \/ No offence/i }).click();
      const actionLabel = i === totalClips - 1 ? "Submit" : "Next";
      if (i === totalClips - 1) {
        submitResponsePromise = page.waitForResponse(
          (resp) => resp.url().includes("/api/tests/videos/") && resp.url().endsWith("/submit") && resp.request().method() === "POST"
        );
      }
      await page.getByRole("button", { name: actionLabel, exact: true }).first().click();
      await expect(page.getByRole("heading", { name: "Your answer" })).toHaveCount(0);
    }

    expect(submitResponsePromise).toBeTruthy();
    const submitResponse = await submitResponsePromise!;
    expect(submitResponse.ok(), "Submit API failed").toBeTruthy();

    await page.waitForURL(`**/practice/video-tests/${sessionId}/results`, { timeout: 15000 });
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("text=/score|results|correct|Test Complete|out of/i").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Question Review")).toBeVisible();

    const firstResultCard = page.locator("button").filter({ hasText: "Video 1" }).first();
    await firstResultCard.click();

    await expect(page.getByText("Restart").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Sanction").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Criteria").first()).toBeVisible({ timeout: 5000 });

    await expect(page.getByText("Play on / No offence").first()).toBeVisible();

    const expectedLabels = page.getByText("Expected");
    await expect(expectedLabels.first()).toBeVisible();
    expect(await expectedLabels.count()).toBeGreaterThanOrEqual(3);

    const yourAnswerLabels = page.getByText("Your answer");
    expect(await yourAnswerLabels.count()).toBeGreaterThanOrEqual(3);

    await page.getByRole("button", { name: /Close/i }).click();
  });

  test("answer overlay enforces completion before Next", async ({ page }) => {
    await page.goto("/practice");
    await page.waitForLoadState("domcontentloaded");

    const testCard = page.getByText(createdTestName).first();
    await expect(testCard).toBeVisible({ timeout: 15000 });

    const startResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/tests/videos/start") && resp.request().method() === "POST"
    );
    await page.locator("button", { hasText: "Start test" }).first().click();
    const startResponse = await startResponsePromise;
    expect(startResponse.ok()).toBeTruthy();
    const startPayload = await startResponse.json().catch(() => ({}));
    const sessionId = startPayload?.session?.id;

    await page.waitForURL(`**/practice/video-tests/${sessionId}`, { timeout: 15000 });
    await expect(page.getByText(/Video \d+ \/ \d+/)).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Answer question" }).click();
    await expect(page.getByRole("heading", { name: "Your answer" })).toBeVisible({ timeout: 5000 });

    const nextBtn = page.getByRole("button", { name: "Next", exact: true }).first();
    await expect(nextBtn).toBeDisabled();

    // Play-on path also counts as complete.
    await page.getByRole("button", { name: /Play on \/ No offence/i }).click();

    await expect(nextBtn).toBeEnabled();
  });

  test("layout controls are visible in one screen and quit exists", async ({ page }) => {
    await page.goto("/practice");
    await page.waitForLoadState("domcontentloaded");

    const testCard = page.getByText(createdTestName).first();
    await expect(testCard).toBeVisible({ timeout: 15000 });

    const startResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/tests/videos/start") && resp.request().method() === "POST"
    );
    await page.locator("button", { hasText: "Start test" }).first().click();
    const startResponse = await startResponsePromise;
    expect(startResponse.ok()).toBeTruthy();
    const startPayload = await startResponse.json().catch(() => ({}));
    const sessionId = startPayload?.session?.id;

    await page.waitForURL(`**/practice/video-tests/${sessionId}`, { timeout: 15000 });
    await expect(page.getByText(/Video \d+ \/ \d+/)).toBeVisible({ timeout: 15000 });

    await expect(page.locator("video")).toBeVisible();
    await expect(page.getByText(/Plays:/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Answer question" })).toBeVisible();
    await expect(page.getByLabel("Volume")).toBeVisible();
    await expect(page.getByRole("button", { name: "Quit test" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);
    await expect(page.getByText(/\d+ answered/).first()).toBeVisible();
    await expect(page.getByText(/\d+ remaining/).first()).toBeVisible();
  });
});
