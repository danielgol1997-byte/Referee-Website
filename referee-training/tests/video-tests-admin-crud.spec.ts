import { expect, test } from "@playwright/test";

type EligibleRequestPayload = {
  filters?: {
    activeStatus?: "all" | "active" | "inactive";
    customTagFilters?: {
      category?: string[];
    };
  };
};

test.describe("Admin video tests CRUD", () => {
  test("create 3 tests, edit all with persisted filters, delete all via modal", async ({ page }) => {
    await page.goto("/super-admin?tab=referee");

    const created: Array<{ id: string; name: string }> = [];
    const prefix = `PW Admin Video Test ${Date.now()}`;

    for (let i = 1; i <= 3; i += 1) {
      await page.getByRole("button", { name: "Create test" }).click();
      await expect(page.getByRole("heading", { name: "Create video test" })).toBeVisible();

      const name = `${prefix} #${i}`;
      await page.getByPlaceholder("Test name").fill(name);
      await page.getByRole("button", { name: "Continue to clip selection" }).click();
      await expect(page.getByText(/Matching clips:/)).toBeVisible({ timeout: 20000 });

      const allStatusBtn = page.getByRole("button", { name: "All Status" }).first();
      await allStatusBtn.click();
      await expect(allStatusBtn).toHaveClass(/bg-accent/);

      await expect(page.getByText("Matching clips: 0")).toHaveCount(0);

      const createResponsePromise = page.waitForResponse(
        (resp) => resp.url().endsWith("/api/admin/video-tests") && resp.request().method() === "POST"
      );
      await page.getByRole("button", { name: "Create video test" }).click();
      const createResponse = await createResponsePromise;
      const createPayload = await createResponse.json().catch(() => ({}));
      expect(createResponse.ok(), `Create failed: ${JSON.stringify(createPayload)}`).toBeTruthy();
      const createdTestId = createPayload?.test?.id as string | undefined;
      expect(createdTestId, "Create response missing test id").toBeTruthy();

      created.push({ id: createdTestId!, name });
      await expect(page.getByRole("heading", { name: "Manage video tests" })).toBeVisible();
      await expect(page.locator(`#admin-manage-test-${createdTestId}`)).toBeVisible();
    }

    await expect(page.getByRole("button", { name: "Edit full" })).toHaveCount(0);

    for (const entry of created) {
      const card = page.locator(`#admin-manage-test-${entry.id}`);
      await expect(card).toBeVisible();

      const eligibleRequestPromise = page.waitForRequest((req) => {
        if (!req.url().includes("/api/admin/video-tests/eligible") || req.method() !== "POST") return false;
        const payload = req.postDataJSON() as EligibleRequestPayload;
        return payload?.filters?.activeStatus === "all";
      });

      await card.getByRole("button", { name: "Edit" }).click();
      await expect(page.getByRole("heading", { name: "Edit video test" })).toBeVisible();
      await eligibleRequestPromise;

      const updatedName = `${entry.name} Updated`;
      await page.getByPlaceholder("Test name").fill(updatedName);
      await page.getByRole("button", { name: "Continue to clip selection" }).click();
      await expect(page.getByText("Matching clips: 0")).toHaveCount(0);

      const updateResponsePromise = page.waitForResponse(
        (resp) =>
          /\/api\/admin\/video-tests\/[^/]+$/.test(new URL(resp.url()).pathname) &&
          resp.request().method() === "PATCH"
      );
      await page.getByRole("button", { name: "Save changes" }).click();
      const updateResponse = await updateResponsePromise;
      const updatePayload = await updateResponse.json().catch(() => ({}));
      expect(updateResponse.ok(), `Update failed: ${JSON.stringify(updatePayload)}`).toBeTruthy();

      const updatedCard = page.locator(`#admin-manage-test-${entry.id}`);
      await expect(updatedCard).toBeVisible();
      await expect(updatedCard.getByText(updatedName)).toBeVisible();
    }

    for (const entry of created) {
      const existingOk = page.getByRole("button", { name: "OK" });
      if (await existingOk.count()) {
        await existingOk.first().click();
      }

      const card = page.locator(`#admin-manage-test-${entry.id}`);
      await expect(card).toBeVisible();
      const deleteResponsePromise = page.waitForResponse(
        (resp) =>
          /\/api\/admin\/video-tests\/[^/]+$/.test(new URL(resp.url()).pathname) &&
          resp.request().method() === "DELETE"
      );
      await card.getByRole("button", { name: "Delete" }).click();

      await expect(page.getByRole("heading", { name: "Delete Video Test" })).toBeVisible();
      await expect(page.getByText(/Are you sure you want to delete/)).toBeVisible();
      await page.getByRole("button", { name: "Confirm" }).click();

      const deleteResponse = await deleteResponsePromise;
      const deletePayload = await deleteResponse.json().catch(() => ({}));
      expect(deleteResponse.ok(), `Delete failed: ${JSON.stringify(deletePayload)}`).toBeTruthy();
      await expect(page.getByRole("heading", { name: "Success" })).toBeVisible();
      await page.getByRole("button", { name: "OK" }).click();
      await expect(page.locator(`#admin-manage-test-${entry.id}`)).toHaveCount(0);
    }
  });
});
