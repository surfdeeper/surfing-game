import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/snapshots',
  outputDir: './tests/visual/results',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['html', { outputFolder: 'tests/visual/report' }]],

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    video: 'on', // Record videos for all tests
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run stories',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100, // Allow small differences
    },
  },
});
