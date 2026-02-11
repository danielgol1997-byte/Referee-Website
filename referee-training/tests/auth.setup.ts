import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate as super admin', async ({ page, context }) => {
  console.log('Starting authentication setup...');
  const email = process.env.PW_SUPER_ADMIN_EMAIL || "super@example.com";
  const password = process.env.PW_SUPER_ADMIN_PASSWORD || "super123";

  // Ensure deterministic credentials auth for Playwright.
  const passwordHash = await hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Playwright Super Admin",
      password: passwordHash,
      role: "SUPER_ADMIN",
      authProvider: "credentials",
      profileComplete: true,
      country: "England",
      isActive: true,
    },
    update: {
      password: passwordHash,
      role: "SUPER_ADMIN",
      authProvider: "credentials",
      profileComplete: true,
      country: "England",
      isActive: true,
    },
  });
  
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
      email,
      password,
      csrfToken: csrfToken,
      callbackUrl: 'http://localhost:3000/super-admin',
      json: 'true',
    },
  });

  console.log(`✓ Signin response status: ${signinResponse.status()}`);
  expect(signinResponse.status()).toBe(200);

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
