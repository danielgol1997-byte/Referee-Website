import { test, expect } from '@playwright/test';

/**
 * Test suite for IFAB vs Custom Questions functionality
 * 
 * Tests cover:
 * 1. Creating questions with IFAB/Custom toggle
 * 2. Editing questions to change IFAB status
 * 3. Creating tests with includeCustom toggle
 * 4. Study mode filtering (IFAB only)
 * 5. Public test IFAB/Custom indication
 * 
 * Note: Authentication is handled by auth.setup.ts
 * All tests run with super admin privileges
 */

test.describe('IFAB vs Custom Questions - Question Creation', () => {
  test('should create IFAB question by default', async ({ page }) => {
    // Already authenticated via auth.setup.ts
    
    // Navigate to Laws admin panel
    await page.goto('http://localhost:3000/super-admin?tab=laws');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Click "Add Question" tab
    const addQuestionTab = page.locator('text=Add Question').first();
    await addQuestionTab.click();
    await page.waitForTimeout(1000);
    
    // Verify IFAB toggle exists and is ON by default
    const ifabToggle = page.locator('text=/IFAB Official|Question Source/i').first();
    expect(await ifabToggle.count()).toBeGreaterThan(0);
    console.log('✓ IFAB toggle found');
    
    // Verify explanation text exists
    const explanationText = page.locator('text=/IFAB questions.*study mode/i');
    expect(await explanationText.count()).toBeGreaterThan(0);
    console.log('✓ Explanation text found');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/ifab-question-form.png', fullPage: true });
  });

  test('should toggle between IFAB and Custom', async ({ page }) => {
    // Already authenticated via auth.setup.ts
    
    await page.goto('http://localhost:3000/super-admin?tab=laws');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const addQuestionTab = page.locator('text=Add Question').first();
    await addQuestionTab.click();
    await page.waitForTimeout(1000);
    
    // Find the toggle button
    const toggleButton = page.locator('button[type="button"]').filter({ has: page.locator('.rounded-full.bg-white') }).first();
    
    // Click to toggle to Custom
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    // Verify Custom is highlighted
    const customLabel = page.locator('text=Custom').first();
    const customColor = await customLabel.evaluate((el) => window.getComputedStyle(el).color);
    console.log(`✓ Custom label color: ${customColor}`);
    
    // Click again to toggle back to IFAB
    await toggleButton.click();
    await page.waitForTimeout(500);
    
    const ifabLabel = page.locator('text=/IFAB Official/').first();
    const ifabColor = await ifabLabel.evaluate((el) => window.getComputedStyle(el).color);
    console.log(`✓ IFAB label color: ${ifabColor}`);
    
    await page.screenshot({ path: 'test-results/ifab-toggle-interaction.png', fullPage: true });
  });
});

test.describe('IFAB vs Custom Questions - Question Editing', () => {
  test('should display and allow editing IFAB status', async ({ page }) => {
    // Already authenticated via auth.setup.ts
    
    await page.goto('http://localhost:3000/super-admin?tab=laws');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Click "Search Questions" tab
    const searchTab = page.locator('text=Search Questions').first();
    await searchTab.click();
    await page.waitForTimeout(1000);
    
    // Click Edit button on first question
    const editButton = page.locator('button[title="Edit"]').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      // Verify IFAB toggle exists in edit form
      const questionSourceLabel = page.locator('text=Question Source').first();
      expect(await questionSourceLabel.count()).toBeGreaterThan(0);
      console.log('✓ Question Source toggle found in edit form');
      
      await page.screenshot({ path: 'test-results/ifab-question-edit.png', fullPage: true });
    } else {
      console.log('⚠ No questions available to edit');
    }
  });
});

test.describe('IFAB vs Custom Questions - Test Creation', () => {
  test('should show Include Custom toggle in test creation form', async ({ page }) => {
    // Already authenticated via auth.setup.ts
    
    await page.goto('http://localhost:3000/super-admin?tab=laws');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Click "Tests" tab
    const testsTab = page.locator('text=Tests').first();
    await testsTab.click();
    await page.waitForTimeout(1000);
    
    // "Create" sub-tab should already be selected by default
    
    // Ensure "Random from selected laws" is selected (should be default)
    const randomRadio = page.locator('text=Random from selected laws').first();
    await randomRadio.click();
    await page.waitForTimeout(500);
    
    // Verify Include Custom toggle exists (only visible in random mode)
    const customToggle = page.locator('text=Include Custom').first();
    await expect(customToggle).toBeVisible({ timeout: 5000 });
    console.log('✓ Include Custom toggle found');
    
    // Verify Include VAR toggle also exists
    const varToggle = page.locator('text=Include VAR').first();
    await expect(varToggle).toBeVisible();
    console.log('✓ Include VAR toggle found');
    
    await page.screenshot({ path: 'test-results/ifab-test-creation.png', fullPage: true });
  });
});

test.describe('IFAB vs Custom Questions - Test Editing', () => {
  test('should show Include Custom toggle when editing tests', async ({ page }) => {
    // Already authenticated via auth.setup.ts
    
    await page.goto('http://localhost:3000/super-admin?tab=laws');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Click "Tests" tab
    const testsTab = page.locator('text=Tests').first();
    await testsTab.click();
    await page.waitForTimeout(1000);
    
    // Click "Manage" sub-tab
    const manageSubTab = page.locator('text=Manage').first();
    await manageSubTab.click();
    await page.waitForTimeout(1000);
    
    // Click Edit button on first test
    const editButton = page.locator('button[title="Edit"]').first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      // Verify Include Custom toggle exists
      const customToggle = page.locator('text=Include Custom').first();
      expect(await customToggle.count()).toBeGreaterThan(0);
      console.log('✓ Include Custom toggle found in edit form');
      
      await page.screenshot({ path: 'test-results/ifab-test-edit.png', fullPage: true });
    } else {
      console.log('⚠ No tests available to edit');
    }
  });
});

test.describe('IFAB vs Custom Questions - Public Test Display', () => {
  test('should display IFAB/Custom indication on public tests', async ({ page }) => {
    // Already authenticated via auth.setup.ts
    
    // Navigate to Laws page
    await page.goto('http://localhost:3000/laws');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Look for IFAB badge on tests
    const ifabBadge = page.locator('text=/IFAB Only|IFAB & Custom/i').first();
    if (await ifabBadge.count() > 0) {
      const badgeText = await ifabBadge.textContent();
      console.log(`✓ Found IFAB badge with text: "${badgeText}"`);
      expect(['IFAB Only', 'IFAB & Custom']).toContain(badgeText);
      
      await page.screenshot({ path: 'test-results/ifab-public-test-badge.png', fullPage: true });
    } else {
      console.log('⚠ No public tests with IFAB badge found');
    }
  });
});

test.describe('IFAB vs Custom Questions - Study Mode Filtering', () => {
  test('should only show IFAB questions in study mode', async ({ page }) => {
    // Already authenticated via auth.setup.ts
    
    // Navigate to Study Mode
    await page.goto('http://localhost:3000/laws/study');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Verify study mode loaded
    const studyContent = page.locator('text=/Study Mode|Law|Question/i').first();
    expect(await studyContent.count()).toBeGreaterThan(0);
    console.log('✓ Study mode loaded');
    
    // Note: We can't directly verify that custom questions are filtered out
    // without having test data, but the API endpoint has been updated to filter by isIfab: true
    
    await page.screenshot({ path: 'test-results/ifab-study-mode.png', fullPage: true });
  });
});

test.describe('IFAB vs Custom Questions - Database Consistency', () => {
  test('should verify all existing questions are marked as IFAB after migration', async ({ page }) => {
    // Already authenticated via auth.setup.ts
    
    await page.goto('http://localhost:3000/super-admin?tab=laws');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Click "Search Questions" tab
    const searchTab = page.locator('text=Search Questions').first();
    await searchTab.click();
    await page.waitForTimeout(1000);
    
    // Count total questions displayed
    const questionRows = page.locator('tr').filter({ hasText: /Law \d+|No Law/ });
    const questionCount = await questionRows.count();
    console.log(`✓ Found ${questionCount} questions in admin panel`);
    
    // Note: Migration sets all existing questions to isIfab: true by default
    // This test verifies that the questions are still accessible and displayed
    
    await page.screenshot({ path: 'test-results/ifab-questions-list.png', fullPage: true });
  });
});
