import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/stories',
  use: {
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'npm run stories',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
  },
});
