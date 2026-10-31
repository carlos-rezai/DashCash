import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'docs/',
    '**/node_modules/',
    '**/dist/',
    '**/out/',
    '**/release/',
    '**/.vite/',
    '**/storybook-static/',
    '**/coverage/',
    '**/playwright-report/',
    '**/test-results/',
    '**/.stryker-tmp/',
    '**/reports/',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  prettier,
);
