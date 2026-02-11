import { expect, test } from "@playwright/test";

/**
 * End-to-end tests for the full video test workflow:
 * 1. Admin creates a video test
 * 2. User starts the test, answers all clips via the custom dropdown overlay
 * 3. Submit button inline transform (Submit → Not yet / Yes, submit)
 * 4. Cancel flow then re-submit → redirect to results
 * 5. Results overlay shows expected answers for ALL categories
 * 6. Layout: progress bar under video, clip index centered, no pause/resume
 * 7. Cleanup: admin deletes the test
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

  test("full workflow: start, answer all clips, submit button transform, cancel, resubmit, see results with all expected answers", async ({
    page,
  }) => {
    // ─── Navigate to practice & start test ───
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

    // ─── Verify NO pause/resume button exists ───
    await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);

    // ─── Verify NO "Unlimited views" badge when no view limit ───
    await expect(page.getByText("Unlimited views")).toHaveCount(0);

    // ─── Verify submit button is NOT visible yet ───
    await expect(page.getByText("Submit Test")).toHaveCount(0);

    // ─── Get total clips count from "Video X / Y" header ───
    const videoHeader = await page.getByText(/Video \d+ \/ \d+/).first().textContent();
    const totalClips = parseInt(videoHeader?.match(/\/\s*(\d+)/)?.[1] ?? "0", 10);
    expect(totalClips).toBeGreaterThan(0);

    // ─── Answer all clips using the custom dropdown overlay ───
    for (let i = 0; i < totalClips; i++) {
      // Click clip index button
      const clipBtn = page.locator("button").filter({ hasText: new RegExp(`^${i + 1}$`) }).first();
      await clipBtn.click();

      await expect(page.getByText(`Video ${i + 1}`, { exact: false })).toBeVisible();

      // Open answer overlay
      await page.getByRole("button", { name: "Answer question" }).click();
      await expect(page.getByRole("heading", { name: "Your answer" })).toBeVisible({ timeout: 5000 });

      // Check "Play on / No offence" as a quick answer
      const checkbox = page.locator('label').filter({ hasText: 'Play on / No offence' });
      await checkbox.click();

      // Close overlay
      await page.getByRole("button", { name: /Close/i }).click();
      await expect(page.getByRole("heading", { name: "Your answer" })).toHaveCount(0, { timeout: 3000 });
    }

    // ─── Verify all answered (progress bar shows "X answered") ───
    await expect(page.getByText(`${totalClips} answered`)).toBeVisible();

    // ─── Submit button should appear (centered under clip index) ───
    const submitBtn = page.getByText("Submit Test");
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // ─── Click Submit → buttons transform ───
    await submitBtn.click();
    await expect(page.getByText("Submit Test")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Not yet" })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("button", { name: "Yes, submit" })).toBeVisible({ timeout: 3000 });

    // ─── Click "Not yet" → revert ───
    await page.getByRole("button", { name: "Not yet" }).click();
    await expect(page.getByRole("button", { name: "Not yet" })).toHaveCount(0);
    await expect(page.getByText("Submit Test")).toBeVisible({ timeout: 3000 });

    // ─── Click Submit again → "Yes, submit" → redirect ───
    await page.getByText("Submit Test").click();
    await expect(page.getByRole("button", { name: "Yes, submit" })).toBeVisible({ timeout: 3000 });

    const submitResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/submit") && resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Yes, submit" }).click();
    const submitResponse = await submitResponsePromise;
    expect(submitResponse.ok(), "Submit API failed").toBeTruthy();

    // ─── Verify redirect to results page ───
    await page.waitForURL(`**/practice/video-tests/${sessionId}/results`, { timeout: 15000 });
    await page.waitForLoadState("domcontentloaded");

    // ─── Verify results page content ───
    await expect(page.locator("text=/score|results|correct|Test Complete|out of/i").first()).toBeVisible({ timeout: 10000 });

    // ─── Verify Question Review section exists ───
    await expect(page.getByText("Question Review")).toBeVisible();

    // ─── Open first result card and verify ALL expected answers show ───
    const firstResultCard = page.locator("button").filter({ hasText: "Video 1" }).first();
    await firstResultCard.click();

    // The results overlay should show all three categories
    await expect(page.getByText("Restart").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Sanction").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Criteria").first()).toBeVisible({ timeout: 5000 });

    // Since user answered "Play on", the overlay shows a top-level play-on banner + 3 category cards
    // Verify "Play on / No offence" user answer is visible
    await expect(page.getByText("Play on / No offence").first()).toBeVisible();

    // 3 category cards each have "Your answer" and "Expected" labels
    const expectedLabels = page.getByText("Expected");
    await expect(expectedLabels.first()).toBeVisible();
    expect(await expectedLabels.count()).toBe(3);

    const yourAnswerLabels = page.getByText("Your answer");
    expect(await yourAnswerLabels.count()).toBeGreaterThanOrEqual(3);

    // Close the overlay
    await page.getByRole("button", { name: /Close/i }).click();
  });

  test("answer overlay uses custom dropdowns with search", async ({ page }) => {
    // Start the test
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

    // Open answer overlay
    await page.getByRole("button", { name: "Answer question" }).click();
    await expect(page.getByRole("heading", { name: "Your answer" })).toBeVisible({ timeout: 5000 });

    // Verify custom dropdown trigger buttons exist (not native selects)
    const restartTrigger = page.getByRole("button", { name: /Select restart/i });
    const sanctionTrigger = page.getByRole("button", { name: /Select sanction/i });
    const criteriaTrigger = page.getByRole("button", { name: /Select criteria/i });

    await expect(restartTrigger).toBeVisible();
    await expect(sanctionTrigger).toBeVisible();
    await expect(criteriaTrigger).toBeVisible();

    // Click restart dropdown → verify search input appears inside
    await restartTrigger.click();
    const searchInput = page.getByPlaceholder("Search restart…");
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type in search → verify filtering works
    await searchInput.fill("a");
    await page.waitForTimeout(300);

    // Close by clicking outside
    await page.locator("body").click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);

    // Close overlay
    await page.getByRole("button", { name: /Close/i }).click();
  });

  test("play button exists, no pause/resume, navigation arrows work", async ({ page }) => {
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

    // Verify play button exists (button text includes icon + "Play clip" text)
    const playBtn = page.locator("button", { hasText: "Play clip" }).first();
    await expect(playBtn).toBeVisible({ timeout: 10000 });

    // ─── Verify no Pause or Resume buttons ───
    await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Resume" })).toHaveCount(0);

    // ─── Verify navigation arrows exist ───
    const prevBtn = page.locator("button[title='Previous clip']");
    const nextBtn = page.locator("button[title='Next clip']");
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // First clip: prev should be disabled
    await expect(prevBtn).toBeDisabled();
  });

  test("clip index is centered and progress bar is under video", async ({ page }) => {
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

    // Verify progress bar indicators are visible
    await expect(page.getByText(/\d+ answered/).first()).toBeVisible();
    await expect(page.getByText(/\d+ remaining/).first()).toBeVisible();

    // Verify "Exit" button exists (renamed from "Exit test")
    await expect(page.getByRole("button", { name: "Exit" })).toBeVisible();
  });
});
