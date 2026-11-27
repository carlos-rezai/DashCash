import { defineConfig, mergeConfig } from 'vitest/config';
import vitestConfig from './vitest.config.ts';

// The root Vitest config plus an exclude of the three files that hold the
// whole-repository tests (design log D4). They check the state of the
// repository, not code, and fail inside Stryker's sandbox; Verify still runs
// them. Files by name, never by pattern. Coverage is off, so a Mutation run
// runs as it did before the coverage reports.
export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      exclude: [
        'gates/commitMsgHook/commitMsgHookTracking.test.ts',
        'gates/formatting/formattingTree.test.ts',
        'gates/lint/lintTree.test.ts',
      ],
      coverage: { enabled: false },
    },
  }),
);
