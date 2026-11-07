/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  coverageAnalysis: 'perTest',
  mutate: [
    'packages/domain/src/**/*.ts',
    'scripts/**/*.ts',
    'gates/**/*.ts',
    '!**/*.test.ts',
    '!**/test-support/**',
  ],
  reporters: ['clear-text', 'progress', 'html'],
  thresholds: { high: 80, low: 60, break: 80 },
  vitest: { configFile: 'vitest.stryker.config.ts' },
};
