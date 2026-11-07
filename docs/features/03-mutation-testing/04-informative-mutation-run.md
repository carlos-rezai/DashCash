---
status: done
---
# Informative mutation run

## Parent PRD

`prd.md`

## What to build

The tracer bullet of **Mutation testing**, end to end (plan Phase 3; PRD
"npm scripts", "Gate tests" and "Testing Decisions"; design log Q14, Q15,
Q17, Q26, A6). `npm run test:mutation` runs the configuration from
`03-stryker-configuration.md`: a **Mutation run** mutates the **Shipping
code** of `scripts/`, the non-test `.ts` files of `gates/` (design log,
Implementation Results, D1) and, from its first module, `packages/domain`,
runs only the related tests per **Mutant** through the Vitest runner,
prints the **Mutation score** and the **Surviving mutants**, writes the
**Mutation report** to `reports/mutation/mutation.html`, and fails only
when Stryker cannot run, since there is no **Break threshold** yet.

- `package.json`: the script `test:mutation` = `stryker run
  stryker.config.js`. `verify`, `verify:full` and `check:licenses` are
  unchanged; neither **Verify** nor **Verify full** runs `test:mutation`,
  so the **Required check** is unchanged.
- `gates/gateWiring/gateWiring.test.ts` pins the new script's command and
  that **Verify** still runs exactly its eleven gates in their order and
  neither `verify` nor `verify:full` runs `test:mutation`.
- The builder runs `npm run test:mutation` by hand, after `npm run verify`
  is green. No test runs Stryker (A6). A full run takes long and its log
  lists every **Surviving mutant**: start it in the background with its
  output in a log file outside the repository, wait for it to end, and
  read only the summary table at the end of the log and the exit code
  (design log, Assumptions from prd-to-issues, I2). Record the run's wall
  time in minutes and seconds, measured from start to exit: whether it is
  under 10 minutes decides whether `05-nightly-mutation-job.md` also adds
  the run to the pull-request workflow (design log, Implementation
  Results, D2).
- The domain pattern `packages/domain/src/**/*.ts` stays in `mutate`
  although no domain file exists (Q17). If Stryker refuses it, use the form
  of that pattern Stryker accepts, in `stryker.config.js` and in the
  `mutate` assertion of `gates/mutationTesting/mutationTesting.test.ts`,
  and record the finding in the ticket's Notes.
- A test that fails only inside Stryker's sandbox is a finding for the
  Notes and is fixed at its cause, never by weakening a check (PRD,
  Further Notes). The one exception is D4 below: a test that checks the
  state of the repository rather than code leaves the run by file name.
- Whole-repository tests (design log, Implementation Results, D4, which
  supersedes Q18 and A1's five keys). The first run's dry run failed in
  the sandbox on four tests. Each moves unchanged (same name, assertions
  and setup; only its file changes) into a file of its own, with the
  imports, constants and helpers it needs:
  - "the hook file › is the only file in the hooks folder" and "the hook
    file › is tracked with mode 100755", from
    `gates/commitMsgHook/commitMsgHook.test.ts` to
    `gates/commitMsgHook/commitMsgHookTracking.test.ts`;
  - "repository tree › passes format:check", from
    `gates/formatting/formatting.test.ts` to
    `gates/formatting/formattingTree.test.ts`;
  - "repository tree › passes lint", from `gates/lint/lint.test.ts` to
    `gates/lint/lintTree.test.ts`.
  Every other test stays where it is. The moved tests keep running in
  **Verify**.
- `vitest.stryker.config.ts` at the repository root: the root
  `vitest.config.ts` plus an exclude of exactly those three files, listed
  by file name, never by pattern; everything else as the root config.
- `stryker.config.js` gains a sixth key, `vitest`, that points the Vitest
  runner at `vitest.stryker.config.ts` (`configFile`), the runner's other
  options at their defaults.
- `gates/mutationTesting/mutationTesting.test.ts`: the key-set assertion
  becomes the six keys and pins the `vitest` option; a new check fails
  when the Stryker Vitest config's excluded test files differ from exactly
  the three files above (one gained, lost or replaced, or a pattern in
  place of a name), and checks its other settings equal the root config's.
- A further test file joins the excluded list only through a ticket that
  names it (`docs/conventions.md`, Test layers).

This ticket is the approval to add exactly the `test:mutation` script to
`package.json`; to change `gates/gateWiring/gateWiring.test.ts`; to create
`vitest.stryker.config.ts`; to add the `vitest` key to
`stryker.config.js`; to change `gates/mutationTesting/mutationTesting.test.ts`;
and to move the four tests named above out of
`gates/commitMsgHook/commitMsgHook.test.ts`,
`gates/formatting/formatting.test.ts` and `gates/lint/lint.test.ts` into
the three new files, changing nothing else in them.

## Acceptance criteria

- [x] The wiring test fails when `test:mutation` runs anything but
      `stryker run stryker.config.js`, and when `verify` or `verify:full`
      runs it; `verify` still runs exactly its eleven gates in order.
- [x] The domain pattern is in `mutate` although no domain file exists; if
      Stryker refuses it, the form it accepts is used and the finding is in
      the ticket's Notes.
- [x] The four whole-repository tests live in
      `commitMsgHookTracking.test.ts`, `formattingTree.test.ts` and
      `lintTree.test.ts`, unchanged in name, assertions and setup; nothing
      else in their old files changed. The ticket's Notes show the diff of
      each move, so the reviewer can confirm it. `npm test` runs the same
      number of tests as before the move.
- [x] The gate test pins the six keys of `stryker.config.js`, its `vitest`
      option pointing at `vitest.stryker.config.ts`, and that config's
      excluded test files as exactly the three files by name; it fails when
      a file is gained, lost or replaced, or a pattern stands in for a
      name.
- [x] The builder's run, no test: `npm run test:mutation` (with the
      `.stryker-tmp/**` exclude in place) mutates files of `scripts/` and
      `gates/` but no `*.test.ts` file, collects the sandbox's tests,
      prints a **Mutation score** and the **Surviving mutants**, writes
      `reports/mutation/mutation.html` and exits 0; the score and the
      wall time (minutes and seconds) are in the ticket's Notes, and
      `git status` shows nothing new afterwards.
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `01-licence-check-fails-closed.md` (the first **Mutation
  run** measures the fixed check)
- Blocked by `03-stryker-configuration.md` (the packages and the
  configuration)

## User stories addressed

- User stories 10, 13, 15, 16, 22, 23, 24, 26

## Notes

Test count: `npm test` ran 1016 tests (6 failed, the RED ones; 1010 passed) before the moves and 1016 (all passed) after them. Equal.

### The four moves

Each diff below is the old file after the move (lines removed, nothing added); the new file follows it in full. Each new file adds only a header comment, its imports, and the constants and helpers its tests need.

#### `gates/commitMsgHook/commitMsgHook.test.ts` to `gates/commitMsgHook/commitMsgHookTracking.test.ts`

Removed from `gates/commitMsgHook/commitMsgHook.test.ts`:

```diff
@@ -70,12 +69,0 @@ describe('the hook file', () => {
-  it('is the only file in the hooks folder', () => {
-    const tracked = runSampleGit(ROOT, 'ls-files', '--', '.githooks');
-
-    expect(tracked.split('\n')).toEqual([HOOK_PATH]);
-  });
-
-  it('is tracked with mode 100755', () => {
-    const entry = runSampleGit(ROOT, 'ls-files', '--stage', '--', HOOK_PATH);
-
-    expect(entry.split(' ')[0]).toBe('100755');
-  });
-
```

New file `gates/commitMsgHook/commitMsgHookTracking.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  ROOT,
  runSampleGit,
} from '../../scripts/test-support/sampleRepository/sampleRepository.ts';

// Whole-repository tests of the Commit-msg hook: they check how git tracks
// the hook in this repository, not code, so the Stryker Vitest config leaves
// this file out of a Mutation run (design log D4). Verify still runs it.

const HOOK_PATH = '.githooks/commit-msg';

describe('the hook file', () => {
  it('is the only file in the hooks folder', () => {
    const tracked = runSampleGit(ROOT, 'ls-files', '--', '.githooks');

    expect(tracked.split('\n')).toEqual([HOOK_PATH]);
  });

  it('is tracked with mode 100755', () => {
    const entry = runSampleGit(ROOT, 'ls-files', '--stage', '--', HOOK_PATH);

    expect(entry.split(' ')[0]).toBe('100755');
  });
});
```

#### `gates/formatting/formatting.test.ts` to `gates/formatting/formattingTree.test.ts`

Removed from `gates/formatting/formatting.test.ts`:

```diff
@@ -184,7 +183,0 @@ describe('format scripts', { timeout: 30_000 }, () => {
-
-describe('repository tree', { timeout: 60_000 }, () => {
-  it('passes format:check', () => {
-    const result = runScript('format:check', ROOT);
-    expect(result.status, result.output).toBe(0);
-  });
-});
```

New file `gates/formatting/formattingTree.test.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runNpmScript } from '../../scripts/test-support/runNpmScript/runNpmScript.ts';

// Whole-repository test of the formatting gate: it formats the repository
// itself, not code, so the Stryker Vitest config leaves this file out of a
// Mutation run (design log D4). Verify still runs it.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function runScript(
  name: string,
  cwd: string,
): { status: number | null; output: string } {
  const { status, output } = runNpmScript(name, cwd, { rootBin: true });
  return { status, output };
}

describe('repository tree', { timeout: 60_000 }, () => {
  it('passes format:check', () => {
    const result = runScript('format:check', ROOT);
    expect(result.status, result.output).toBe(0);
  });
});
```

#### `gates/lint/lint.test.ts` to `gates/lint/lintTree.test.ts`

Removed from `gates/lint/lint.test.ts`:

```diff
@@ -354,8 +353,0 @@ describe('lint script', { timeout: 30_000 }, () => {
-
-describe('repository tree', { timeout: 120_000 }, () => {
-  it('passes lint', () => {
-    const result = runScript('lint', ROOT);
-
-    expect(result.status, result.output).toBe(0);
-  });
-});
```

New file `gates/lint/lintTree.test.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runNpmScript } from '../../scripts/test-support/runNpmScript/runNpmScript.ts';

// Whole-repository test of the lint gate: it lints the repository itself,
// not code, so the Stryker Vitest config leaves this file out of a Mutation
// run (design log D4). Verify still runs it.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function runScript(
  name: string,
  cwd: string,
): { status: number | null; output: string } {
  const { status, output } = runNpmScript(name, cwd, { rootBin: true });
  return { status, output };
}

describe('repository tree', { timeout: 120_000 }, () => {
  it('passes lint', () => {
    const result = runScript('lint', ROOT);

    expect(result.status, result.output).toBe(0);
  });
});
```

### The Mutation run

- Command: `npm run test:mutation`, started in the background, output in a log outside the repository. Exit code 0.
- Mutation score: 82.04 % (89.31 % of covered mutants). 1315 killed, 14 timeout, 159 survived, 132 no coverage, 0 errors.
- Wall time: 3 minutes 25 seconds (205 s, start to exit; Stryker's own "Done in" says 3 minutes 22 seconds). Under 10 minutes, so ticket 05 adds the run to the pull-request workflow (D2).
- The dry run passed in the sandbox with `vitest.stryker.config.ts`; no other test needed excluding.
- Domain pattern: Stryker does not refuse `packages/domain/src/**/*.ts`; it warns `Glob pattern "packages/domain/src/**/*.ts" did not result in any files` and goes on. The pattern stays as it is in `stryker.config.js` and in the `mutate` assertion.
- No `*.test.ts` file in the report. `reports/mutation/mutation.html` was written; `git status` shows nothing new from the run (`.stryker-tmp/` and `reports/` are ignored).
