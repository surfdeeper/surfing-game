import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './packages/visual-regression-testing-viewer-react-application/tests/e2e',
  use: {
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'npm run stories',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
  },
});
