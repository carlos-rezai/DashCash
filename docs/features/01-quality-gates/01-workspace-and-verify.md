---
status: done
---
# Workspace, verify and CI

## Parent PRD

`prd.md`

## What to build

The tracer bullet of plan Phase 1: an npm **Workspace** root on the pinned
Node with a committed lockfile, strict TypeScript over the root project,
Vitest, the first **Verify** (`typecheck`, then `test`), **Verify full**
running **Verify**, and the CI workflow that runs them on push and on pull
requests. After this ticket a push of the branch runs **Verify** green in
CI.

The shapes are in the PRD, Implementation Decisions: "Workspace and
toolchain", "npm scripts", "Vitest" and "CI workflow". For now the
`pull-request` job runs only `npm run verify:full`; ticket 09 adds the
**Pull-request check** to it.

The first test is the gate wiring test (PRD Testing Decisions, design log
A4, P1, P2), at the repository root as `gateWiring.test.ts` (design log
I4). It reads the root `package.json`, `.github/workflows/ci.yml` and
`.nvmrc` and pins only the gates present so far; every later ticket that
adds a gate extends its expected list.

The RED commit of this ticket brings the root `package.json` with the test
tooling (`vitest`, `yaml`) and the lockfile, so that the wiring test runs
and fails on the missing wiring, not on a missing test runner (design log
I1).

## Acceptance criteria

- [x] The root `package.json` is private, `"type": "module"`, MIT, with the
      workspaces `apps/*` and `packages/*` and `engines.node` `24.14.0`;
      no **Workspace member** has a `package.json`.
- [x] `.nvmrc` reads `24.14.0`; `.npmrc` sets `engine-strict=true` and
      `save-exact=true`, so `npm ci` installs from the committed lockfile on
      Node `24.14.0` and refuses another Node version.
- [x] `npm run typecheck` runs `tsc` on the root project, which extends a
      strict base configuration (`strict`, `noUncheckedIndexedAccess` and
      the other options of the PRD) and type-checks the JavaScript configs
      too (A6); it is green.
- [x] `npm test` runs every `*.test.ts` and `*.test.tsx` once, never a
      `*.spec.ts`, and is green.
- [x] `npm run verify` runs `typecheck`, then `test`, chained with `&&`,
      stops at the first failure with a non-zero exit, and runs in
      `cmd.exe` and in CI; no npm script holds `$(...)`, a glob or a pipe.
- [x] `npm run verify:full` runs `npm run verify`.
- [x] `.github/workflows/ci.yml` replaces `.github/.gitkeep`: job `verify`
      on push to `feat/**` and `refactor/**` runs `npm run verify`; job
      `pull-request` on pull requests into `main` runs
      `npm run verify:full` on GitHub's default merge ref (A3); both check
      out the full history, set up Node from `.nvmrc` with the npm cache,
      run `npm ci`, use `ubuntu-latest` and reference actions by version
      tag.
- [x] The gate wiring test fails when a gate is removed from `verify` or
      reordered, when `verify:full` stops running `verify`, when either CI
      job stops running its command, and when `.nvmrc` and `engines.node`
      differ.
- [ ] A push of the branch runs the `verify` job green in CI.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 1, 2, 3, 4, 5, 6, 7
- User stories 8, 9, 10, 11, 12, 13, 14
- User stories 29, 30, 31, 32
- User stories 33, 34, 35
- User stories 80, 81, 82, 83, 84
