import { test, expect } from '@playwright/test';

const LAW_COLOR = '159, 114, 203'; // RGB values for #9B72CB

test.describe('Laws Tagging System - Quick Check', () => {
  
  test('Login and verify laws filter exists with correct color', async ({ page }) => {
    // Go directly to library page
    await page.goto('http://localhost:3000/library');
    
    // Wait for page load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check if we need to login
    const loginButton = await page.locator('text=Log in').count();
    if (loginButton > 0) {
      console.log('Logging in...');
      await page.click('text=Log in');
      
      // Wait for navigation to login page
      await page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      
      // Fill login form
      await page.fill('input[type="email"]', 'super@example.com');
      await page.fill('input[type="password"]', 'super123');
      await page.click('button[type="submit"]');
      
      // Wait for redirect after login
      await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      // Navigate back to library
      await page.goto('http://localhost:3000/library');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
    }
    
    // Hover over the top area to reveal filter bar
    const topArea = page.locator('body').first();
    await topArea.hover({ position: { x: 400, y: 50 } });
    await page.waitForTimeout(1500);
    
    // Look for any element with the law color
    const lawColorElements = await page.locator(`[style*="rgb(${LAW_COLOR})"], [style*="#9B72CB"], [style*="#9b72cb"]`).count();
    
    console.log(`✓ Found ${lawColorElements} elements with law color`);
    expect(lawColorElements).toBeGreaterThan(0);
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'test-results/laws-filter-bar.png', fullPage: true });
    console.log('✓ Screenshot saved to test-results/laws-filter-bar.png');
  });

  test('Verify laws category in tag manager', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    
    // Login if needed
    const loginButton = await page.locator('text=Log in').count();
    if (loginButton > 0) {
      await page.click('text=Log in');
      await page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await page.fill('input[type="email"]', 'super@example.com');
      await page.fill('input[type="password"]', 'super123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    
    // Navigate to tag manager
    await page.goto('http://localhost:3000/super-admin?tab=library');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Click Tags tab
    const tagsTab = page.locator('text=Tags').first();
    await tagsTab.click();
    await page.waitForTimeout(1000);
    
    // Look for Laws category
    const lawsText = await page.locator('text=/^Laws$/').count();
    console.log(`✓ Found ${lawsText} "Laws" elements in tag manager`);
    expect(lawsText).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/laws-tag-manager.png', fullPage: true });
    console.log('✓ Screenshot saved to test-results/laws-tag-manager.png');
  });

  test('Verify laws dropdown in upload form', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    
    // Login if needed
    const loginButton = await page.locator('text=Log in').count();
    if (loginButton > 0) {
      await page.click('text=Log in');
      await page.waitForURL('**/login', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await page.fill('input[type="email"]', 'super@example.com');
      await page.fill('input[type="password"]', 'super123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    
    // Go to library
    await page.goto('http://localhost:3000/library');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Click Upload Video button
    const uploadButton = page.locator('text=Upload Video').first();
    await uploadButton.click();
    await page.waitForTimeout(1500);
    
    // Look for Laws dropdown
    const lawsDropdown = await page.locator('text=/^Laws$/').count();
    console.log(`✓ Found ${lawsDropdown} "Laws" dropdown in upload form`);
    expect(lawsDropdown).toBeGreaterThan(0);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/laws-upload-form.png', fullPage: true });
    console.log('✓ Screenshot saved to test-results/laws-upload-form.png');
  });
});
