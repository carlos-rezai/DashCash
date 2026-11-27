import { configDefaults, defineConfig } from 'vitest/config';

// Coverage is always on: one LCOV report over the Shipping code of the four
// folders, no tests, stories, test-support/, e2e/ or declaration files. The
// Story tests report the same files to coverage/stories/ (gates/coverage/).
export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [...configDefaults.exclude, '.stryker-tmp/**'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['lcov'],
      reportsDirectory: 'coverage/unit',
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
  },
});
