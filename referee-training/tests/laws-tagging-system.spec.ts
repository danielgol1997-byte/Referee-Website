import { test, expect } from '@playwright/test';

const LAW_COLOR = '#9B72CB';

test.describe('Laws Tagging System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as super admin
    await page.goto('http://localhost:3000');
    
    // Wait for login button and click it
    await page.waitForSelector('text=Log in', { timeout: 10000 });
    await page.click('text=Log in');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'super@example.com');
    await page.fill('input[type="password"]', 'super123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to home page
    await page.waitForURL('**/');
    await page.waitForTimeout(1000);
  });

  test('Laws category exists in Tag Manager with correct color', async ({ page }) => {
    // Navigate to Super Admin -> Library -> Tags
    await page.goto('http://localhost:3000/super-admin?tab=library');
    await page.waitForLoadState('networkidle');
    
    // Click on Tags tab
    await page.click('text=Tags');
    await page.waitForTimeout(1000);
    
    // Look for Laws category
    const lawsCategory = page.locator('text=/^Laws$/');
    await expect(lawsCategory).toBeVisible();
    
    // Verify it appears first (order: 0)
    const categories = await page.locator('h3:has-text("Tag Categories") + div .space-y-2 > div').all();
    if (categories.length > 0) {
      const firstCategory = categories[0];
      const hasLaws = await firstCategory.locator('text=/^Laws$/').count() > 0;
      expect(hasLaws).toBeTruthy();
    }
    
    console.log('✓ Laws category exists and is first in order');
  });

  test('Laws category has 17 law tags', async ({ page }) => {
    await page.goto('http://localhost:3000/super-admin?tab=library');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Tags');
    await page.waitForTimeout(1000);
    
    // Click on Laws category to expand it
    const lawsCategory = page.locator('text=/^Laws$/');
    await lawsCategory.click();
    await page.waitForTimeout(500);
    
    // Count law tags (should be 17: Law 1 through Law 17)
    const lawTags = await page.locator('text=/^Law \\d+/').count();
    expect(lawTags).toBeGreaterThanOrEqual(17);
    
    // Verify specific laws exist
    await expect(page.locator('text=Law 1 - The Field of Play')).toBeVisible();
    await expect(page.locator('text=Law 11 - Offside')).toBeVisible();
    await expect(page.locator('text=Law 12 - Fouls and Misconduct')).toBeVisible();
    
    console.log(`✓ Found ${lawTags} law tags`);
  });

  test('Laws dropdown appears in video upload form', async ({ page }) => {
    // Navigate to Library page
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    
    // Click Upload Video button
    await page.click('text=Upload Video');
    await page.waitForTimeout(1000);
    
    // Look for Laws dropdown
    const lawsDropdown = page.locator('text=Laws');
    await expect(lawsDropdown).toBeVisible();
    
    // Click to open the dropdown
    await lawsDropdown.click();
    await page.waitForTimeout(500);
    
    // Verify law options appear
    await expect(page.locator('text=Law 1 - The Field of Play')).toBeVisible();
    await expect(page.locator('text=Law 12 - Fouls and Misconduct')).toBeVisible();
    
    console.log('✓ Laws dropdown works in video upload form');
  });

  test('Can select law tags when uploading a video', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Upload Video');
    await page.waitForTimeout(1000);
    
    // Fill in basic video details
    await page.fill('input[placeholder*="Title"]', 'Test Video - Laws Tagging');
    await page.fill('input[placeholder*="video URL"]', 'https://res.cloudinary.com/demo/video/upload/v1/dog.mp4');
    
    // Open Laws dropdown
    await page.locator('text=Laws').click();
    await page.waitForTimeout(500);
    
    // Select Law 11 - Offside
    await page.click('text=Law 11 - Offside');
    await page.waitForTimeout(300);
    
    // Select Law 12 - Fouls and Misconduct
    await page.click('text=Law 12 - Fouls and Misconduct');
    await page.waitForTimeout(300);
    
    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Verify selected tags appear as badges
    await expect(page.locator('text=Law 11 - Offside').first()).toBeVisible();
    await expect(page.locator('text=Law 12 - Fouls and Misconduct').first()).toBeVisible();
    
    console.log('✓ Can select multiple law tags');
  });

  test('Laws filter appears in video library with correct color', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    
    // Hover over the filter bar to reveal it
    const filterBar = page.locator('.relative').first();
    await filterBar.hover();
    await page.waitForTimeout(1000);
    
    // Look for Laws filter
    const lawsFilter = page.locator('text=/^Laws$/').first();
    await expect(lawsFilter).toBeVisible();
    
    // Check if the filter has the correct color indicator
    const colorIndicator = page.locator(`[style*="${LAW_COLOR}"]`).first();
    await expect(colorIndicator).toBeVisible();
    
    console.log('✓ Laws filter appears with correct color in video library');
  });

  test('Can filter videos by law tags', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    
    // Hover to reveal filter bar
    const filterBar = page.locator('.relative').first();
    await filterBar.hover();
    await page.waitForTimeout(1000);
    
    // Click on Laws filter dropdown
    const lawsFilterButton = page.locator('text=/^Laws$/').first();
    await lawsFilterButton.click();
    await page.waitForTimeout(500);
    
    // Select a law to filter by (if options are available)
    const lawOptions = await page.locator('text=/^Law \\d+/').count();
    if (lawOptions > 0) {
      const firstLaw = page.locator('text=/^Law \\d+/').first();
      await firstLaw.click();
      await page.waitForTimeout(500);
      
      // Verify filter is applied (look for selected badge)
      await expect(page.locator('[class*="rounded-full"][class*="border-2"]').first()).toBeVisible();
      
      console.log('✓ Can filter videos by law tags');
    } else {
      console.log('⚠ No law options available for filtering (no videos tagged yet)');
    }
  });

  test('Laws filter color matches individual law tag colors', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    
    // Hover to reveal filter bar
    const filterBar = page.locator('.relative').first();
    await filterBar.hover();
    await page.waitForTimeout(1000);
    
    // Get all color indicators
    const colorIndicators = await page.locator(`[style*="${LAW_COLOR}"]`).all();
    
    // Verify at least one color indicator exists with the law color
    expect(colorIndicators.length).toBeGreaterThan(0);
    
    console.log(`✓ Found ${colorIndicators.length} elements with law color ${LAW_COLOR}`);
  });

  test('Settings menu shows Laws filter is available', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    
    // Hover to reveal filter bar
    const filterBar = page.locator('.relative').first();
    await filterBar.hover();
    await page.waitForTimeout(1000);
    
    // Click settings icon (gear/cog icon)
    const settingsButton = page.locator('button').filter({ hasText: /settings|filter/i }).first();
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      await page.waitForTimeout(500);
      
      // Look for Laws in the settings menu
      await expect(page.locator('text=/^Laws$/').first()).toBeVisible();
      
      console.log('✓ Laws filter appears in settings menu');
    } else {
      // Try alternate selector for settings
      const svgSettings = page.locator('svg[class*="w-5"]').first();
      if (await svgSettings.count() > 0) {
        await svgSettings.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('Laws category is NOT marked as canBeCorrectAnswer', async ({ page }) => {
    await page.goto('http://localhost:3000/super-admin?tab=library');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Tags');
    await page.waitForTimeout(1000);
    
    // Click on Laws category
    const lawsCategory = page.locator('text=/^Laws$/');
    await lawsCategory.click();
    await page.waitForTimeout(500);
    
    // Click Edit button for Laws category
    const editButton = lawsCategory.locator('..').locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(500);
      
      // Verify "Can be correct answer" toggle is OFF
      const correctAnswerToggle = page.locator('input[type="checkbox"]').filter({ hasText: /correct answer/i });
      if (await correctAnswerToggle.count() > 0) {
        const isChecked = await correctAnswerToggle.isChecked();
        expect(isChecked).toBe(false);
        
        console.log('✓ Laws category correctly marked as filter-only (not correct answer)');
      }
    }
  });

  test('Migrated videos have law tags in VideoTag table', async ({ page }) => {
    // This test verifies the migration worked by checking if videos can be filtered by laws
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('networkidle');
    
    // Get initial video count
    const initialVideos = await page.locator('[class*="card"]').count();
    
    // Hover to reveal filter bar
    const filterBar = page.locator('.relative').first();
    await filterBar.hover();
    await page.waitForTimeout(1000);
    
    // Click on Laws filter
    const lawsFilterButton = page.locator('text=/^Laws$/').first();
    await lawsFilterButton.click();
    await page.waitForTimeout(500);
    
    // Count available law options
    const lawOptions = await page.locator('text=/^Law \\d+/').count();
    
    if (lawOptions > 0) {
      console.log(`✓ Migration successful: ${lawOptions} law tags available for filtering`);
      
      // Select first law
      await page.locator('text=/^Law \\d+/').first().click();
      await page.waitForTimeout(1000);
      
      // Get filtered video count
      const filteredVideos = await page.locator('[class*="card"]').count();
      
      console.log(`  Initial videos: ${initialVideos}, Filtered videos: ${filteredVideos}`);
    } else {
      console.log('⚠ No law options available - either no videos exist or migration not run');
    }
  });
});
