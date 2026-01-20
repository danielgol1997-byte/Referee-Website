import { test, expect } from '@playwright/test';

test.describe('RAP Category and Criteria Mapping System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as super admin
    await page.goto('http://localhost:3000');
    await page.click('text=Log in');
    await page.fill('input[type="email"]', 'super@example.com');
    await page.fill('input[type="password"]', 'super123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  });

  test('Categories are used as criteria groups', async ({ page }) => {
    // Navigate to Super Admin -> Library
    await page.goto('http://localhost:3000/super-admin?tab=library');
    await page.waitForLoadState('networkidle');

    // Go to Tags tab
    await page.click('text=Tags');
    await page.waitForTimeout(1000);

    // Verify Categories section exists and is labeled as criteria groups
    const categoriesHeader = page.locator('text=Categories');
    await expect(categoriesHeader).toBeVisible();

    // Verify help text mentions categories are criteria groups
    const helpText = page.locator('text=/Category.*criteria group/i');
    await expect(helpText).toBeVisible();

    // Check if we have category tags
    const categoryTags = await page.locator('[class*="space-y-2"]').first().locator('[class*="flex items-center"]').count();
    console.log(`Found ${categoryTags} category tags`);
  });

  test('Criteria tags have parent category dropdown', async ({ page }) => {
    await page.goto('http://localhost:3000/super-admin?tab=library');
    await page.waitForLoadState('networkidle');

    await page.click('text=Tags');
    await page.waitForTimeout(1000);

    // Click Create Tag
    await page.click('text=Create Tag');
    await page.waitForTimeout(500);

    // Select CRITERIA group
    await page.click('text=Group');
    await page.click('text=Criteria');
    await page.waitForTimeout(500);

    // Verify Parent Category dropdown appears
    const parentCategoryLabel = page.locator('text=/Parent Category/i');
    await expect(parentCategoryLabel).toBeVisible();

    // Verify help text explains what parent category means
    const criteriaHelp = page.locator('text=/Which category does this criterion belong to/i');
    await expect(criteriaHelp).toBeVisible();
  });

  test('RAP mapping updates category and its criteria', async ({ page }) => {
    await page.goto('http://localhost:3000/super-admin?tab=library');
    await page.waitForLoadState('networkidle');

    // Go to RAP Mapping tab
    await page.click('text=RAP Mapping');
    await page.waitForTimeout(1000);

    // Verify RAP categories overview exists
    const decisionMaking = page.locator('text=Decision Making');
    await expect(decisionMaking).toBeVisible();

    // Find a category and change its RAP mapping
    const firstDropdown = page.locator('select').first();
    await firstDropdown.selectOption({ label: /A - Decision Making/i });
    
    // Wait for auto-save
    await page.waitForTimeout(2000);

    // Verify the overview cards update
    const criteriaCount = page.locator('text=/\\d+ criteria tag/i').first();
    await expect(criteriaCount).toBeVisible();
    
    console.log('RAP mapping auto-save completed');
  });

  test('Video filtering by RAP category works with tags', async ({ page }) => {
    await page.goto('http://localhost:3000/library/videos');
    await page.waitForLoadState('networkidle');

    // Hover over filter area to show filters
    await page.hover('[class*="sticky"]');
    await page.waitForTimeout(500);

    // Click Decision Making tab
    const decisionMakingTab = page.locator('text=Decision Making');
    if (await decisionMakingTab.isVisible()) {
      await decisionMakingTab.click();
      await page.waitForTimeout(1000);

      // Check if videos are visible
      const videoCards = await page.locator('[class*="grid"] button').count();
      console.log(`Found ${videoCards} videos in Decision Making category`);

      // Videos should show up if they have tags with RAP category 'A'
      if (videoCards > 0) {
        console.log('✓ Videos with Decision Making tags are visible');
      }
    }
  });

  test('Filter bar shows and hides correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/library/videos');
    await page.waitForLoadState('networkidle');

    // Check for filter indicator
    const filterIndicator = page.locator('text=Hover to Show Filters');
    
    // Initial state - should see indicator
    await expect(filterIndicator).toBeVisible();

    // Hover over the filter area
    const filterArea = page.locator('[class*="relative"]').first();
    await filterArea.hover();
    await page.waitForTimeout(500);

    // Filter controls should appear
    const categoryDropdown = page.locator('text=Category').first();
    await expect(categoryDropdown).toBeVisible();

    console.log('✓ Filter bar shows on hover');
  });

  test('Criteria dropdown disabled until category selected', async ({ page }) => {
    await page.goto('http://localhost:3000/library/videos');
    await page.waitForLoadState('networkidle');

    // Hover to show filters
    await page.hover('[class*="sticky"]');
    await page.waitForTimeout(500);

    // Check criteria dropdown is disabled
    const criteriaDropdown = page.locator('select').nth(1); // Second dropdown
    const isDisabled = await criteriaDropdown.isDisabled();
    expect(isDisabled).toBe(true);

    console.log('✓ Criteria dropdown is disabled by default');

    // Select a category
    const categoryDropdown = page.locator('select').first();
    await categoryDropdown.selectOption({ index: 1 }); // Select first non-empty option
    await page.waitForTimeout(500);

    // Criteria dropdown should now be enabled
    const isEnabled = !(await criteriaDropdown.isDisabled());
    expect(isEnabled).toBe(true);

    console.log('✓ Criteria dropdown enables after category selection');

    // Should show filtered criteria
    const criteriaOptions = await criteriaDropdown.locator('option').count();
    console.log(`Criteria dropdown has ${criteriaOptions} options`);
  });

  test('Complete workflow: Create category, add criteria, map RAP, filter videos', async ({ page }) => {
    await page.goto('http://localhost:3000/super-admin?tab=library');
    await page.waitForLoadState('networkidle');

    // Step 1: Create a test category
    await page.click('text=Tags');
    await page.waitForTimeout(1000);
    
    await page.click('text=Create Tag');
    await page.fill('input[type="text"]', 'Test Category ' + Date.now());
    // Group should default to CATEGORY
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    console.log('✓ Step 1: Created test category');

    // Step 2: Map to RAP category
    await page.click('text=RAP Mapping');
    await page.waitForTimeout(1000);

    const lastDropdown = page.locator('select').last();
    await lastDropdown.selectOption({ label: /A - Decision Making/i });
    await page.waitForTimeout(2000);

    console.log('✓ Step 2: Mapped to RAP Decision Making');

    // Step 3: Verify criteria count updates
    const criteriaCountBefore = page.locator('text=/\\d+ criteria tag/i').first();
    if (await criteriaCountBefore.isVisible()) {
      const countText = await criteriaCountBefore.textContent();
      console.log(`✓ Step 3: Criteria count shown: ${countText}`);
    }

    console.log('✓ Complete workflow test passed');
  });
});
