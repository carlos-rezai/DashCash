---
status: done
---
# npm ci installs the Electron binary

## Parent PRD

`prd.md`

## What to build

One mechanism installs the **Electron binary**, on every machine (plan
Phase 12; PRD "Electron binary"; design log Q26, Q27, A4, P2). This
supersedes 04's D3 for the CI steps and the README line.

- Root `package.json`: `"postinstall": "install-electron"`, so `npm ci` and
  `npm install` install the binary everywhere and fail when the download
  fails.
- `.github/workflows/ci.yml`, `.github/workflows/pull-request.yml` and
  `.github/workflows/daily.yml`: the `node_modules/.bin/install-electron`
  steps go from the `verify`, `pull-request` and `mutation` jobs; each job
  runs `npm ci` and then its tests with no install step between them.
- `gates/electronInstall/electronInstall.ts`:
  `findElectronInstallProblems(scripts, workflows, npmrc)`, `scripts` being
  `package.json`'s scripts, `workflows` the parsed workflows by file name,
  `npmrc` the text of `.npmrc` or empty when it is missing. One line per
  problem: a `postinstall` that is missing or not exactly
  `install-electron`; every workflow step that runs `install-electron`,
  named by file and job; an `ignore-scripts=true` line in `.npmrc` (A4).
  `gates/electronInstall/electronInstall.test.ts`: it finds nothing in the
  committed files, and one sample per problem; the old install-step tests
  and their sample edits go, and "installs the Electron binary only in the
  verify, pull-request and mutation jobs" becomes "no workflow step runs
  install-electron".
- The pinned command lists lose the install step: "runs exactly npm ci, …
  then npm run verify in the verify job" in `gates/pushWorkflow/`, the
  pull-request job's commands in `gates/pullRequestWorkflow/`, and the
  mutation job's commands and steps in `gates/dailyMutation/` (its test and
  the finder's list of allowed commands); each test name follows its new
  commands.
- `README.md`, Getting started: the manual `install-electron` line goes;
  `npm ci` gets the comment that it installs the **Electron binary**.

This ticket is the approval to add exactly the `postinstall` script to
`package.json`; to remove the `install-electron` steps from
`.github/workflows/ci.yml`, `.github/workflows/pull-request.yml` and
`.github/workflows/daily.yml`; and to change `gates/electronInstall/`,
`gates/pushWorkflow/pushWorkflow.test.ts`,
`gates/pullRequestWorkflow/pullRequestWorkflow.test.ts` and
`gates/dailyMutation/`.

## Acceptance criteria

- [x] A RED commit changes the Electron install check's tests and the
      pinned job commands, and fails on the current configuration.
- [x] The check names a missing or different `postinstall`, every workflow
      step that runs `install-electron`, and an `ignore-scripts=true` line
      in `.npmrc`; it finds nothing in the committed files.
- [x] The `verify`, `pull-request` and `mutation` jobs run `npm ci` and
      their tests with no install step between them.
- [x] `README.md` no longer holds the manual line; `npm ci` carries the
      comment that it installs the **Electron binary**.
- [x] `npm run verify:full` is green after `npm ci`.

## Blocked by

- Blocked by `08-secret-scan-and-electron-install-finders.md`

## User stories addressed

- User stories 42, 43, 44, 45, 46
