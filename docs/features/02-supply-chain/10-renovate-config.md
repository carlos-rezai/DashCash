---
status: open
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
  `minimumReleaseAge: "3 days"`; `schedule` `before 6am on monday`;
  `timezone` `Europe/Berlin`; the default `renovate/` branch prefix. Two
  `packageRules` groups, each with a fixed `commitMessage` and `prTitle`
  and no template variables (Q36):
  - npm packages: `chore: [supply-chain] update npm dependencies` /
    `chore: update npm dependencies`;
  - GitHub Actions: `chore: [supply-chain] update github actions` /
    `chore: update github actions`.
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

## Acceptance criteria

- [ ] Every commit message is fixed text `chore: [supply-chain] …` and
      passes the commitlint config through its Node API.
- [ ] Every PR title is fixed text `chore: …` and passes the
      **Pull-request check** core on a `renovate/*` branch.
- [ ] The gate test fails, on invented config variants, for a templated
      message, a message naming another feature, a message the commitlint
      config rejects, a title the check rejects, and each changed setting
      of story 51 (presets, `semanticCommits`, a `commitBody`, automerge,
      release age, schedule, timezone, branch prefix).
- [ ] The gate test passes on `renovate.json`.
- [ ] No dependency is added.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 45, 46, 47, 50, 51, 52
- User story 48 (npm packages, GitHub Actions)
