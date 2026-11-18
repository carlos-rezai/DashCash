import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// The Story tests: every story of .storybook/main.ts runs as a test in one
// headless Chromium. `npm test` stays the Node run of vitest.config.ts.
export default defineConfig({
  plugins: [storybookTest({ configDir: '.storybook' })],
  // React and styled-components are CommonJS: pre-bundled up front, they reach
  // the browser as ES modules instead of raw.
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      'styled-components',
    ],
  },
  test: {
    name: 'storybook',
    // The same Shipping code as the unit run, reported to coverage/stories/.
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: 'coverage/stories',
      include: [
        'apps/**/*.{ts,tsx}',
        'packages/**/*.{ts,tsx}',
        'scripts/**/*.{ts,tsx}',
        'gates/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.stories.{ts,tsx}',
        '**/test-support/**',
        'e2e/**',
        '**/*.d.ts',
      ],
    },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
