import { expect, test } from "@playwright/test";

/**
 * Real end-to-end batch upload test for AR clips: two generated videos go
 * through the queue flow with actual signed Cloudinary uploads.
 *
 * Requires /tmp/pw-ar-clip-one.mp4 and /tmp/pw-ar-clip-two.mp4 (tiny ffmpeg
 * test videos). Skipped if they don't exist.
 */

import fs from "fs";

const FILE_ONE = "/tmp/pw-ar-clip-one.mp4";
const FILE_TWO = "/tmp/pw-ar-clip-two.mp4";

test.describe("A.R. clips – real batch upload", () => {
  test.skip(!fs.existsSync(FILE_ONE) || !fs.existsSync(FILE_TWO), "test videos missing");

  test.afterAll(async ({ browser }) => {
    // Remove the uploaded test clips (DB records).
    const context = await browser.newContext({ storageState: "playwright/.auth/user.json" });
    const page = await context.newPage();
    const res = await page.request.get("http://localhost:3000/api/admin/ar-clips");
    const data = await res.json().catch(() => ({ clips: [] }));
    for (const clip of data.clips ?? []) {
      if (/^pw ar clip/i.test(clip.title)) {
        await page.request.delete(`http://localhost:3000/api/admin/ar-clips/${clip.id}`);
      }
    }
    await context.close();
  });

  test("batch queue: select two files, upload both to Cloudinary, appear in manage list", async ({ page }) => {
    test.setTimeout(240000);

    await page.goto("/super-admin?tab=ar");
    await page.getByRole("button", { name: "Upload Clip" }).click();

    // Select both files at once via the hidden multi-file input.
    await page.locator('input[type="file"][multiple]').setInputFiles([FILE_ONE, FILE_TWO]);

    // ─── Clip 1 of 2 ───
    await expect(page.getByText(/Clip 1 of 2/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("1 left after this")).toBeVisible();
    await expect(page.getByPlaceholder("Clip title")).toHaveValue("pw ar clip one");
    await expect(page.locator('video[src^="blob:"]')).toBeVisible();

    // Capture a pass frame from the preview.
    await page.waitForFunction(() => {
      const v = document.querySelector('video[src^="blob:"]') as HTMLVideoElement | null;
      return !!v && v.readyState >= 2;
    });
    await page.getByRole("button", { name: "+1s" }).click();
    await page.getByRole("button", { name: "Capture frame" }).click();
    await expect(page.getByText(/Captured at/)).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Offside", exact: true }).click();

    const firstCreate = page.waitForResponse(
      (resp) => resp.url().endsWith("/api/admin/ar-clips") && resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Upload & next" }).click();
    const firstResponse = await firstCreate;
    expect(firstResponse.ok(), "First clip create failed").toBeTruthy();

    // ─── Clip 2 of 2 ───
    await expect(page.getByText(/Clip 2 of 2/)).toBeVisible({ timeout: 60000 });
    await expect(page.getByPlaceholder("Clip title")).toHaveValue("pw ar clip two");

    await page.getByRole("button", { name: "Onside", exact: true }).click();

    const secondCreate = page.waitForResponse(
      (resp) => resp.url().endsWith("/api/admin/ar-clips") && resp.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Upload clip", exact: true }).click();
    // No frame captured → confirm dialog.
    await expect(page.getByText("No pass moment captured. Save anyway?")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Confirm" }).click();
    const secondResponse = await secondCreate;
    expect(secondResponse.ok(), "Second clip create failed").toBeTruthy();

    // ─── Wrap-up: manage list shows both, videos hosted in the AR folder ───
    await expect(page.getByText("All 2 clips uploaded.")).toBeVisible({ timeout: 60000 });
    await expect(page.getByText("pw ar clip one")).toBeVisible();
    await expect(page.getByText("pw ar clip two")).toBeVisible();

    const listRes = await page.request.get("/api/admin/ar-clips");
    const listData = await listRes.json();
    const uploaded = (listData.clips ?? []).filter((c: any) => /^pw ar clip/i.test(c.title));
    expect(uploaded.length).toBe(2);
    for (const clip of uploaded) {
      expect(clip.fileUrl).toContain("res.cloudinary.com");
      expect(clip.fileUrl).toContain("referee-training/ar-videos");
    }
    const withFrame = uploaded.find((c: any) => c.passFrameUrl);
    expect(withFrame, "One clip should have a captured pass frame").toBeTruthy();
    expect(withFrame.passFrameUrl).toContain("referee-training/ar-frames");
  });
});
