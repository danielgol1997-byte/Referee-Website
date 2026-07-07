import { expect, test, type Page } from "@playwright/test";
import { prisma } from "../lib/prisma";

/**
 * End-to-end tests for the Assistant Referee offside test:
 * user runner flow (countdown → single play → offside/onside → results)
 * and the AR clips admin panel.
 *
 * Seeds its own short AR clips and restores the previous bank afterwards.
 */

const CLIP_TITLE_PREFIX = `PW AR Clip ${Date.now()}`;

// Short Cloudinary demo video already used by the local library (6s).
const TEST_VIDEO_URL =
  "https://res.cloudinary.com/dh9glizf2/video/upload/eo_13.217847358121329,so_6.310215264187866/v1769503363/referee-training/videos/l1z82pyjpjnutjgd2psk.mp4";
const TEST_THUMB_URL =
  "https://res.cloudinary.com/dh9glizf2/video/upload/eo_13.217847358121329,so_6.310215264187866/c_fill,h_720,q_auto,so_2,w_1280/v1769503363/referee-training/videos/l1z82pyjpjnutjgd2psk.jpg";

let previouslyActiveClipIds: string[] = [];
let seededClipIds: string[] = [];

async function fastForwardCurrentClip(page: Page) {
  // Wait until the countdown finishes and the video is actually playing,
  // then jump near the end so `ended` fires quickly.
  await page.waitForFunction(
    () => {
      const video = document.querySelector("video");
      return !!video && !video.paused && video.currentTime > 0 && Number.isFinite(video.duration);
    },
    { timeout: 20000 }
  );
  await page.evaluate(() => {
    const video = document.querySelector("video");
    if (video && Number.isFinite(video.duration)) {
      video.currentTime = Math.max(video.duration - 0.3, 0);
    }
  });
}

test.describe("A.R. practice – offside test", () => {
  test.beforeAll(async () => {
    // Park existing active AR clips so the seeded set is deterministic.
    const active = await prisma.arClip.findMany({ where: { isActive: true }, select: { id: true } });
    previouslyActiveClipIds = active.map((c) => c.id);
    await prisma.arClip.updateMany({ where: { isActive: true }, data: { isActive: false } });

    const created = await Promise.all(
      [0, 1, 2].map((i) =>
        prisma.arClip.create({
          data: {
            title: `${CLIP_TITLE_PREFIX} ${i + 1}`,
            fileUrl: TEST_VIDEO_URL,
            thumbnailUrl: TEST_THUMB_URL,
            duration: 6,
            correctAnswer: i % 2 === 0 ? "OFFSIDE" : "ONSIDE",
            passMomentTime: 2.5,
            passFrameUrl: TEST_THUMB_URL,
            isActive: true,
          },
        })
      )
    );
    seededClipIds = created.map((c) => c.id);
  });

  test.afterAll(async () => {
    if (seededClipIds.length > 0) {
      const sessions = await prisma.arTestSession.findMany({
        where: { clipIds: { hasSome: seededClipIds } },
        select: { id: true },
      });
      await prisma.arTestSession.deleteMany({ where: { id: { in: sessions.map((s) => s.id) } } });
      await prisma.arClip.deleteMany({ where: { id: { in: seededClipIds } } });
    }
    if (previouslyActiveClipIds.length > 0) {
      await prisma.arClip.updateMany({
        where: { id: { in: previouslyActiveClipIds } },
        data: { isActive: true },
      });
    }
    await prisma.$disconnect();
  });

  test("landing page shows start button and history section", async ({ page }) => {
    await page.goto("/practice/ar");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "Offside Decision Test" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Start Test" })).toBeVisible();
    await expect(page.getByText("Recent Tests")).toBeVisible();
  });

  test("full runner flow: countdown, single play, offside/onside, results with pass frame", async ({ page }) => {
    test.setTimeout(180000);

    await page.goto("/practice/ar");
    await page.waitForLoadState("domcontentloaded");

    const startResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/tests/ar/start") && resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Start Test" }).click();
    const startResponse = await startResponsePromise;
    const startPayload = await startResponse.json().catch(() => ({}));
    expect(startResponse.ok(), `Start failed: ${JSON.stringify(startPayload)}`).toBeTruthy();
    const sessionId = startPayload?.session?.id;
    expect(sessionId, "Missing session id").toBeTruthy();

    await page.waitForURL(`**/practice/ar/${sessionId}`, { timeout: 15000 });
    await expect(page.getByText(/Clip \d+ \/ \d+/)).toBeVisible({ timeout: 15000 });

    // No native video controls in the runner.
    const hasControls = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video?.hasAttribute("controls") ?? false;
    });
    expect(hasControls).toBeFalsy();

    const header = await page.getByText(/Clip \d+ \/ \d+/).first().textContent();
    const totalClips = parseInt(header?.match(/\/\s*(\d+)/)?.[1] ?? "0", 10);
    expect(totalClips).toBe(3);

    let submitResponsePromise: ReturnType<typeof page.waitForResponse> | null = null;
    for (let i = 0; i < totalClips; i++) {
      await expect(page.getByText(`Clip ${i + 1}`, { exact: false }).first()).toBeVisible();

      // Decision buttons must not exist before the clip ends.
      await expect(page.getByRole("button", { name: "Offside", exact: true })).toHaveCount(0);

      await fastForwardCurrentClip(page);

      const offsideBtn = page.getByRole("button", { name: "Offside", exact: true });
      const onsideBtn = page.getByRole("button", { name: "Onside", exact: true });
      await expect(offsideBtn).toBeVisible({ timeout: 15000 });
      await expect(onsideBtn).toBeVisible();
      await expect(page.getByText("Make your call")).toBeVisible();

      if (i === totalClips - 1) {
        submitResponsePromise = page.waitForResponse(
          (resp) =>
            resp.url().includes("/api/tests/ar/") &&
            resp.url().endsWith("/submit") &&
            resp.request().method() === "POST"
        );
      }
      // Alternate answers so results contain both correct and incorrect calls.
      await (i % 2 === 0 ? offsideBtn : onsideBtn).click();
    }

    expect(submitResponsePromise).toBeTruthy();
    const submitResponse = await submitResponsePromise!;
    expect(submitResponse.ok(), "Submit API failed").toBeTruthy();

    // ─── Results page ───
    await page.waitForURL(`**/practice/ar/${sessionId}/results`, { timeout: 20000 });
    await expect(page.getByText("Test Complete")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/% Correct/)).toBeVisible();
    await expect(page.getByText("Clip Review")).toBeVisible();

    // Expandable rows: one per clip with your call + correctness badge.
    const reviewRows = page.locator("button").filter({ hasText: "Your call:" });
    await expect(reviewRows).toHaveCount(totalClips);

    // Open the first row → overlay with answer comparison, replay and pass frame.
    await reviewRows.first().click();
    await expect(page.getByText("Your Call", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Correct Call", { exact: true })).toBeVisible();
    await expect(page.getByText("Watch Again")).toBeVisible();
    await expect(page.getByText("Moment of the Pass")).toBeVisible();
    await expect(page.getByAltText("Freeze-frame at the moment of the pass")).toBeVisible();

    // Enlarge the pass-moment image into the lightbox, then close it.
    await page.getByRole("button", { name: "Enlarge pass moment" }).click();
    await expect(page.getByRole("button", { name: "Close enlarged view" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Close enlarged view" }).click();
    await expect(page.getByRole("button", { name: "Close enlarged view" })).toHaveCount(0);

    // Enlarge the video replay as well.
    await page.getByRole("button", { name: "Enlarge video" }).click();
    await expect(page.getByRole("button", { name: "Close enlarged view" })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Close enlarged view" })).toHaveCount(0);
    // Escape closed only the lightbox — the overlay is still open.
    await expect(page.getByText("Watch Again")).toBeVisible();

    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByText("Watch Again")).toHaveCount(0);

    // ─── History shows the completed test ───
    await page.goto("/practice/ar");
    await expect(page.getByText(/\d+ \/ 3 correct/).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("View results").first()).toBeVisible();
  });

  test("admin panel: list, hide/show toggle, edit form with pass-moment tools", async ({ page }) => {
    await page.goto("/super-admin?tab=ar");
    await page.waitForLoadState("domcontentloaded");

    // Sub-tabs styled like the rest of the admin.
    await expect(page.getByRole("button", { name: /Clips \(\d+\)/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Upload Clip" })).toBeVisible();

    // Bank warning (3 active seeded clips < 10).
    await expect(page.getByText(/3\/10 active clips/)).toBeVisible();

    // Clip cards with answer badges and actions.
    const card = page
      .locator("div")
      .filter({ has: page.getByText(`${CLIP_TITLE_PREFIX} 1`, { exact: true }) })
      .filter({ has: page.getByRole("button", { name: "Edit", exact: true }) })
      .last();
    await expect(card).toBeVisible();

    // Hide → warning count drops, button becomes Show.
    const hideResponsePromise = page.waitForResponse(
      (resp) => /\/api\/admin\/ar-clips\/[^/]+$/.test(new URL(resp.url()).pathname) && resp.request().method() === "PATCH"
    );
    await card.getByRole("button", { name: "Hide", exact: true }).click();
    await hideResponsePromise;
    await expect(page.getByText(/2\/10 active clips/)).toBeVisible({ timeout: 5000 });

    const showResponsePromise = page.waitForResponse(
      (resp) => /\/api\/admin\/ar-clips\/[^/]+$/.test(new URL(resp.url()).pathname) && resp.request().method() === "PATCH"
    );
    await card.getByRole("button", { name: "Show", exact: true }).click();
    await showResponsePromise;
    await expect(page.getByText(/3\/10 active clips/)).toBeVisible({ timeout: 5000 });

    // Edit form pre-filled with pass-moment tools.
    await card.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByText(`Editing: ${CLIP_TITLE_PREFIX} 1`, { exact: false })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder("Clip title")).toHaveValue(`${CLIP_TITLE_PREFIX} 1`);
    await expect(page.getByText("Pass moment", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Capture frame" })).toBeVisible();
    await expect(page.getByRole("button", { name: "−1f" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+1f" })).toBeVisible();
    await expect(page.getByRole("button", { name: "−1s" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+1s" })).toBeVisible();
    await expect(page.getByText("Current frame", { exact: false })).toBeVisible();

    // Title edit round-trip.
    await page.getByPlaceholder("Clip title").fill(`${CLIP_TITLE_PREFIX} 1 edited`);
    const saveResponsePromise = page.waitForResponse(
      (resp) => /\/api\/admin\/ar-clips\/[^/]+$/.test(new URL(resp.url()).pathname) && resp.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: "Save changes" }).click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.ok()).toBeTruthy();
    await expect(page.getByText("Clip updated.")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(`${CLIP_TITLE_PREFIX} 1 edited`)).toBeVisible();
  });

  test("upload form shows required fields", async ({ page }) => {
    await page.goto("/super-admin?tab=ar");
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: "Upload Clip" }).click();
    await expect(page.getByPlaceholder("Clip title")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Choose videos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose folder" })).toBeVisible();
    await expect(page.locator('input[type="file"][multiple]')).toBeAttached();
    await expect(page.getByRole("button", { name: "Offside", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Onside", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload clip", exact: true })).toBeVisible();

    // Validation: no title/answer/file → inline error.
    await page.getByRole("button", { name: "Upload clip", exact: true }).click();
    await expect(page.getByText("Title is required.")).toBeVisible({ timeout: 5000 });
  });
});
