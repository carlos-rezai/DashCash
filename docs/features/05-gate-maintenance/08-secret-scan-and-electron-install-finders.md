---
status: in-progress
---
# Secret scan and Electron install finders; the wiring test gone

## Parent PRD

`prd.md`

## What to build

The last two **Problem finders** become modules that **Mutation testing**
mutates, and `gates/gateWiring/` goes (plan Phase 8; PRD "Workflow readers
and Problem finders"; design log Q20–Q22, A8, P2).

- `gates/secretScan/secretScan.ts` exports
  `findSecretScanProblems(workflow, job)`, and
  `gates/electronInstall/electronInstall.ts` exports
  `findElectronInstallProblems(workflow, job, firstTest)`, each with its
  signature, its constants and its lines unchanged. The Electron install
  check still checks the install steps as 04 built them;
  `12-electron-binary-postinstall.md` changes it in its new place (P2).
  They import only the shared readers of `scripts/readWorkflow/`, never
  `test-support/`; a helper only one finder uses stays in its module (I2).
- The RED commit moves the last tests of
  `gates/gateWiring/gateWiring.test.ts`, unchanged apart from imports, with
  the sample edits they use:
  - `gates/secretScan/secretScan.test.ts`: the `it.each` "runs gitleaks in
    the %s job right after checkout and before setup-node, with comments
    off and the workflow GITHUB_TOKEN"; the `it.each` "fails the %s job
    when %s"; the `it.each` "runs exactly one gitleaks step in the %s job";
    "scans with the default gitleaks rules: a gitleaks step in each job, no
    gitleaks config file and no .gitleaksignore".
  - `gates/electronInstall/electronInstall.test.ts`: the `it.each`
    "installs the Electron binary in its own step directly after npm ci and
    before the first test command in the %s job"; the `it.each` "fails the
    Electron install of the %s job when %s"; "installs the Electron binary
    only in the verify, pull-request and mutation jobs".
- With the last test moved, `gates/gateWiring/` is removed.

This ticket is the approval to create `gates/secretScan/` and
`gates/electronInstall/`, to change `gates/test-support/`, and to remove
`gates/gateWiring/`.

## Acceptance criteria

- [ ] A RED commit adds the two folders' tests, which fail because the
      finder modules do not exist yet.
- [ ] Each finder names the same lines for each sample edit as before and
      none for the committed workflows.
- [ ] `gates/gateWiring/` no longer exists; every one of its tests is found
      in one of the ten folders of Q20, and `npm test` runs as many wiring
      tests as before the split (counts in the ticket's Notes).
- [ ] The finders import only the shared readers, never `test-support/`.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `07-daily-finders.md`

## User stories addressed

- User stories 29, 30, 31, 33
