import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: [...configDefaults.exclude, '.stryker-tmp/**'],
  },
});
