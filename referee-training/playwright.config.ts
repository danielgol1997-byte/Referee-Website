import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests sequentially to avoid database conflicts
  reporter: 'html',
  timeout: 60000, // 60 seconds per test
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000, // 15 seconds for each action
    navigationTimeout: 30000, // 30 seconds for navigation
  },

  projects: [
    // Setup project - runs first to authenticate
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main test project - uses authenticated state
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use the authenticated state for all tests
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'], // Run setup project first
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
