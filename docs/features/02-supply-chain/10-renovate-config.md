---
status: done
---
# Renovate config

## Parent PRD

`prd.md`

## What to build

Renovate's configuration and its gate test, with the base settings and the
first two groups (plan Phase 8; PRD "Renovate config" and "Gate tests",
Renovate; design log Q33–Q38, A12, A13). The Node, lockfile-maintenance
and vulnerability-alert groups follow in `11-renovate-groups.md`.

- `renovate.json` at the repository root: `extends` `config:recommended`,
  `helpers:pinGitHubActionDigests` and `:disableDependencyDashboard`;
  `semanticCommits: "disabled"`; no `commitBody`; no automerge;
  `minimumReleaseAge: "14 days"`, the rule for every pinned version in
  feature 01 (design log, Implementation Results, D3); `schedule`
  `before 6am on monday`; `timezone` `Europe/Berlin`; the default
  `renovate/` branch prefix. Two `packageRules` groups, each with a fixed
  `commitMessage` and a `prTitle` of exactly the same text, and no
  template variables (Q36; one format, Implementation Results, D1):
  - npm packages: `chore: [supply-chain] update npm dependencies`;
  - GitHub Actions: `chore: [supply-chain] update github actions`.
- The **Pull-request check** (`scripts/checkPullRequest/`, feature 01
  ticket 09) changes its `renovate/*` rule to the same format: the title
  is `chore: [supply-chain] <description>`, type `chore`, the feature
  exactly `supply-chain`, no number, and every description rule of the
  commitlint config still applies; still no folder or plan check. The old
  bracket-less form `chore: <description>` now fails. Its tests change
  with it.
- `gates/renovate/renovate.test.ts` reads `renovate.json` and fails when
  any commit message in it fails the loaded commitlint config (through its
  Node API, as `gates/commitMessages/` does), does not name `supply-chain`
  or holds `{{`; when any PR title fails the **Pull-request check** core
  (`scripts/checkPullRequest/`) on a `renovate/*` branch; or when a setting
  above changes. It finds every message and title in the config, so a
  group added later is checked without changing the test.
- No `renovate` package and no config validator (A12); no dependency is
  added.

Then, by hand, after the feature is merged (not a criterion): the human
installs the Renovate GitHub App on the repository; because
`renovate.json` is on `main`, Renovate skips its onboarding PR.

## Between this ticket and 11

This ticket ends with `npm run verify` and CI green (design log,
Implementation Results, D4). The Renovate gate test checks only what
`renovate.json` holds, so the two missing groups fail nothing, and Renovate
itself is installed only after the merge.

## Acceptance criteria

- [x] Every commit message is fixed text `chore: [supply-chain] …` and
      passes the commitlint config through its Node API.
- [x] Every PR title is the same text as its group's commit message and
      passes the **Pull-request check** core on a `renovate/*` branch.
- [x] On `renovate/*`, the **Pull-request check** passes
      `chore: [supply-chain] <description>` and fails the bracket-less
      `chore: <description>`, another feature in the brackets, a number,
      another type, and a description that breaks a description rule
      (upper case, trailing full stop, more than 50 characters, `@` or
      `#`); its tests are updated from the old form to the new one.
- [x] The gate test fails, on invented config variants, for a templated
      message, a message naming another feature, a message the commitlint
      config rejects, a title the check rejects, a title that differs from
      its commit message, and each changed setting
      of story 51 (presets, `semanticCommits`, a `commitBody`, automerge,
      release age, schedule, timezone, branch prefix).
- [x] The gate test passes on `renovate.json`.
- [x] No dependency is added.
- [x] `npm run verify` and CI's `verify` job are green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 45, 46, 47, 50, 51, 52
- User story 48 (npm packages, GitHub Actions)

## Notes

- In `scripts/checkPullRequest/checkPullRequest.ts` `checkRenovateTitle`, the "the title does not follow the format" fallback and `|| header.red` cannot be reached with the real commitlint config (same header pattern, `red-only-on-test`); they only guard a stubbed `lintTitle`; for the refactor.
- Three input checks in `gates/renovate/renovate.ts` have no test: a config that is not an object, a message or title that is not a string, and an explicit `automerge: false` being allowed; for the refactor.
