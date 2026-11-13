import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  forbidOnly: true,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
});
