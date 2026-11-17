import { defineConfig } from '@playwright/test';
import { loadQuarantinePatterns } from './scripts/readQuarantine/readQuarantine.ts';

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  forbidOnly: true,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  grepInvert: loadQuarantinePatterns(process.cwd()),
});
