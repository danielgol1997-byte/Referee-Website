import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate as super admin', async ({ page, context }) => {
  console.log('Starting authentication setup...');
  
  // Method: Use NextAuth callback URL with credentials to authenticate
  // This simulates what NextAuth does internally when you submit credentials
  
  // Step 1: Get CSRF token by visiting signin page
  await page.goto('http://localhost:3000/api/auth/signin');
  await page.waitForLoadState('domcontentloaded');
  
  // Step 2: Call the credentials callback endpoint directly
  // This is what NextAuth's signIn() function does internally
  const csrfResponse = await page.request.get('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.csrfToken;
  console.log('✓ Got CSRF token');

  // Step 3: Submit credentials with CSRF token
  const signinResponse = await context.request.post('http://localhost:3000/api/auth/callback/credentials', {
    form: {
      email: 'super@example.com',
      password: 'super123',
      csrfToken: csrfToken,
      callbackUrl: 'http://localhost:3000/super-admin',
      json: 'true',
    },
  });

  console.log(`✓ Signin response status: ${signinResponse.status()}`);

  // Step 4: Navigate to verify authentication
  await page.goto('http://localhost:3000/super-admin');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Verify we're logged in by checking for super admin content
  const superAdminContent = page.locator('text=/Super Admin|Admin Panel|Laws|Library|Create Test|Manage Tests/i');
  await expect(superAdminContent.first()).toBeVisible({ timeout: 10000 });
  
  console.log('✓ Successfully authenticated as super admin');

  // Save the authenticated state (including cookies and localStorage)
  await context.storageState({ path: authFile });
  console.log(`✓ Saved auth state to ${authFile}`);
});
