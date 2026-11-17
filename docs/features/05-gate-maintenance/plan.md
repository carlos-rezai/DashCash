# Plan: 05 gate-maintenance

> Source PRD: `prd.md`. Decisions: `design-log.md` (Q1–Q36, A1–A8,
> P1–P4). Terms in bold are defined in `docs/ubiquitous-language.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: none. No screen, no component, no story, no domain code
  (Q4).
- **IPC channels**: none added or changed; `app:info` stays the only
  **Channel**.
- **Schema**: none. The **Database** and its empty **Migration** list are
  untouched.
- **App protocol**: `resolveRendererPath(rendererFolder, url)` stays the one
  pure function that decides every refusal; the host rule (exactly
  `dashcash`, no port, no user info) runs before the path rules, and
  `serveAppProtocol` keeps its single 404 path (Q5–Q7). `matchAppOrigin/`
  is not imported.
- **Key models**: `QuarantineEntry` unchanged (its `file` keeps `/`); a
  **Quarantine pattern** is `(?:^| )<file> <title>(?: @\S+)*$`, the file
  relative to `e2e/` with every `/` as `[\\/]`, both parts otherwise
  escaped (Q8, Q10); `EntryDateProblem = { field: 'added' | 'expires'; why:
  string }` (Q24); `Workflow` and `WorkflowStep` from the shared workflow
  readers (Q21); `DASHCASH_DEBUG_PORT`, unset or empty meaning 9222 (Q28).
- **Gate modules**: every new gate module sits beside its test in a
  camelCase folder. Shared gate code goes to `scripts/<module>/`
  (`readWorkflow`, `findEntryDateProblems`, and the changed `readQuarantine`,
  `reportViolations`, `checkQuarantine`, `checkAudit`); **Problem finders**
  are `gates/<gate>/<gate>.ts`; test-only workflow edits stay beside their
  test, or go to `gates/test-support/` when two test files share one. Both
  `scripts/**/*.ts` and `gates/**/*.ts` are already in Stryker's `mutate`
  list, `test-support/` is not; the Stryker exclude list does not change
  (Q22).
- **Gate wiring folders** (Q20, A8): `verifyScripts`, `pushWorkflow`,
  `pullRequestWorkflow`, `pullRequestSandbox`, `pullRequestMutation`,
  `dailyRun`, `dailyMutation`, `secretScan`, `electronInstall`,
  `workflows`. Every assertion of `gates/gateWiring/` moves unchanged into
  one of them; `gates/gateWiring/` is gone once the last one moves (P2).
- **Renovate**: titles come only from **Commit-message parts**; the five
  **Renovate PR** titles stay word for word; the three **Hold rules** come
  last, after the Node rule (Q13–Q18).
- **Startup order** (A1): resolve the **Data folder** → enable the **Debug
  port** in dev, or show the **Startup error** for an invalid
  `DASHCASH_DEBUG_PORT` and stop → take the **Single-instance lock** →
  enable the sandbox, register the `app` scheme → when ready, the
  **Database**, the protocol handler, the session, IPC and the window, as
  04 built them.
- **Electron binary**: installed by the root `postinstall: install-electron`
  under every `npm ci` and `npm install`; no workflow step installs it
  (Q26).
- **Break threshold**: stays 81 until the ratchet phase, which comes after
  every phase that changes mutated code (Q30, A5, A6).
- **Test layers**: Vitest only, for main-process modules, gate modules,
  `scripts/` and gate tests; no **End-to-end test** is added or changed
  (Q4). Phases that touch the app or the end-to-end harness also run
  `npm run verify:full`.
- **Gate files the phases name** (Q34): `gates/endToEnd/` (phase 2);
  `gates/renovate/` (phases 3, 4); the new wiring folders,
  `gates/test-support/` and `gates/gateWiring/` (phases 5 to 8);
  `playwright.config.ts` and `gates/endToEnd/` (phase 11); `package.json`
  (`postinstall`), `.github/workflows/ci.yml`,
  `.github/workflows/pull-request.yml`, `.github/workflows/daily.yml`,
  `gates/electronInstall/`, `gates/pushWorkflow/`,
  `gates/pullRequestWorkflow/` and `gates/dailyMutation/` (phase 12);
  `stryker.config.js` (phase 14); `.claude/hooks/block-dangerous-git.sh`
  and `gates/dangerousGitGuard/` for the human (phase 15). So
  `/feature-pipeline` pauses for the human's `go` after planning.

---

## Phase 1: The App protocol serves only the host dashcash

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8

### What to build

The security fix, failing test first. The refused-URL table that drives
both the path function's test and the protocol handler's test gains the
host cases: another host, `app://dashcash` with a port, a URL with user
info, an empty host and an upper-case host where the URL parser keeps it.
The RED commit shows them served. Then the path function refuses any URL
whose parsed host is not exactly `dashcash` or that holds user info,
before its path rules, and its comment names the new refusals; the handler
answers each of them 404 through its existing path. Every served case and
every path refusal stays as it is, and "Start the app" still loads
`app://dashcash/index.html`.

### Acceptance criteria

- [ ] A RED commit adds the host cases to the refused-URL table, and the
      path function's test and the handler's test fail on them.
- [ ] `app://other/index.html`, `app://dashcash:8080/index.html`,
      `app://x@dashcash/index.html`, an empty host and an upper-case host
      the parser keeps each return `undefined` from the path function and
      404 from the handler.
- [ ] Every existing served URL is still served and every existing refused
      URL (`..`, encoded `..`, absolute paths, another drive) still
      refused.
- [ ] The protocol module imports nothing from `matchAppOrigin/`.
- [ ] `npm run verify:full` is green.

---

## Phase 2: Quarantined tests left out, tagged or in a subfolder

**User stories**: 9, 10, 11, 12, 13, 14, 15

### What to build

A **Quarantine entry** leaves out its test whatever tags it carries and on
either platform. Each **Quarantine pattern** accepts any tags after the
title and either separator between the folders of its file, while the
entry keeps naming its file with `/`. The end-to-end gate test drops its
hand-made model of Playwright's match string (A7) and instead runs
Playwright's own `playwright test --list` with the committed config in a
sample tree: an invented spec in `e2e/sub/` holding a tagged and an
untagged quarantined test and a third test, a top-level spec holding the
old model's cases (the same title in another file, a longer title, regex
characters in a title), and an invented **Quarantine** naming the
quarantined ones. It checks which tests Playwright lists, on the platform
it runs on. No app, no browser, no network.

### Acceptance criteria

- [ ] A RED commit adds the pattern tests and the `--list` gate test, and
      fails on them.
- [ ] A subfolder entry's pattern matches with `/` and with `\`; a test
      with no tag, one tag and several tags matches; a title that itself
      holds a tag matches.
- [ ] The same title in another file, a title that merely starts with the
      entry's title and a title with regex characters matched loosely do
      not match.
- [ ] Playwright's `--list` in the sample tree lists the third test and
      neither quarantined test; it lists the old model's non-matching cases;
      the test starts no app, no browser and no network.
- [ ] The hand-made model of Playwright's string is gone; the check that the
      config's `grepInvert` equals the reader's patterns for the committed
      file stays.
- [ ] The **Quarantine check**'s file rule is unchanged, and
      `e2e/sub/<x>.spec.ts` passes it.
- [ ] `npm run verify:full` is green.

---

## Phase 3: Renovate titles from commit-message parts

**User stories**: 16, 17, 18, 19, 26, 27, 61

### What to build

`renovate.json` stops writing whole messages and titles. The root sets the
prefix `chore: [supply-chain]`; each of the three group rules, lockfile
maintenance and vulnerability alerts sets its own lower-case action, an
empty extra and an empty suffix; lockfile maintenance and vulnerability
alerts set their topic, and a group's topic is its `groupName` (the npm
group's becomes `npm dependencies`). The Renovate gate assembles each
PR-opening scope's title the way Renovate's default template does and
runs it through commitlint and the **Pull-request check**, and fails on a
`commitMessage` or `prTitle` anywhere, a template in any part, a scope that
leaves its action or extra to Renovate and a group rule that sets its own
topic. The check that a title equals its commit message goes. The five
titles come out exactly as before.

### Acceptance criteria

- [ ] A RED commit adds the new gate checks and their failing samples, and
      the committed `renovate.json` fails them.
- [ ] No object in `renovate.json` sets `commitMessage` or `prTitle`.
- [ ] The assembled titles are exactly `chore: [supply-chain] update npm
      dependencies`, `… update github actions`, `… update node`, `… refresh
      the lockfile` and `… fix vulnerable dependencies`; each passes
      commitlint, names the feature `supply-chain` and passes the
      **Pull-request check**; none holds a package name or version.
- [ ] A failing sample for each new rule: a `commitMessage`, a `prTitle`, a
      `{{` in a part, a missing action, a missing extra, a group rule with a
      topic, a title that fails commitlint.
- [ ] The existing checks on base settings, lockfile maintenance and
      vulnerability alerts stay and pass.
- [ ] The ticket's Notes name the manual step after the merge: the human
      checks the titles of the first **Renovate PRs** of each kind.
- [ ] `npm run verify` is green.

---

## Phase 4: Renovate hold rules

**User stories**: 20, 21, 22, 23, 24, 25, 28

### What to build

Renovate stops proposing what the project cannot take yet. Three **Hold
rules** follow the Node rule, in this order: `@types/node` (npm) capped at
`<major>.x`, TypeScript (npm) majors disabled, Node (`nvm` and `npm`)
majors disabled. The Renovate gate gains the text of `.nvmrc` as its third
input (A3) and fails when the cap's major differs from the major in
`.nvmrc`, when a hold is missing, when a hold comes before the Node rule
or reaches lockfile maintenance. The order check becomes: the Node rule
comes after every other npm rule except the hold rules, and every hold rule
(recognised by `enabled: false` or `allowedVersions`) comes after it.
Minors and patches of TypeScript and Node still come.

### Acceptance criteria

- [ ] A RED commit adds the hold checks and their failing samples, and the
      committed `renovate.json` fails them.
- [ ] The committed `renovate.json` and `.nvmrc` pass; the cap is `24.x`
      while `.nvmrc` holds 24.
- [ ] A cap one major off `.nvmrc`, a missing TypeScript hold, a missing
      Node hold, a hold before the Node rule and a hold reaching lockfile
      maintenance each fail.
- [ ] The TypeScript and Node holds match majors only; the Node group still
      groups minors and patches into `update node`.
- [ ] The Phase 3 title checks still pass; no hold rule opens a PR, so none
      needs commit-message parts.
- [ ] `npm run verify` is green.

---

## Phase 5: Shared workflow readers and the wiring checks without a finder

**User stories**: 29, 31, 32, 33

### What to build

The workflow readers leave the gate wiring test for a shared module in
`scripts/` with its own tests on invented workflow text: read one
workflow, list the workflow files (both taking the repository root, A2),
triggers, a job's steps, a job's commands, splitting `&&` chains, the jobs
running a command. The four parts of the **Gate wiring** that hold no
**Problem finder** move into their own gate folders, `verifyScripts`,
`pushWorkflow`, `pullRequestWorkflow` and `workflows`, with every assertion
unchanged and the readers imported from the shared module; they ride
with the readers because a bare move has no test to fail first (P1). The
rest of the wiring test stays in place and uses the shared readers too.

### Acceptance criteria

- [ ] A RED commit adds the readers' tests and the four moved tests, which
      fail because the shared module does not exist yet.
- [ ] Each reader has tests on invented workflow text, and the two that
      read files on an invented tree.
- [ ] The four folders hold exactly the assertions Q20's table gives them,
      word for word apart from imports.
- [ ] The remaining wiring test defines no reader of its own.
- [ ] No shipping module imports `test-support/`.
- [ ] `npm run verify` is green.

---

## Phase 6: Pull-request problem finders, mutated

**User stories**: 29, 30, 31, 33

### What to build

The sandbox and display finder and the pull-request mutation finder each
become the module of their own gate folder, `pullRequestSandbox` and
`pullRequestMutation`, beside the test that moves their assertions and
sample edits out of the wiring test. Each keeps its signature and returns
one line per problem; **Mutation testing** now mutates both. Workflow edits
both folders use go to `gates/test-support/`.

### Acceptance criteria

- [ ] A RED commit adds the two folders' tests, which fail because the
      finder modules do not exist yet.
- [ ] Each finder names the same lines for each sample edit as before and
      none for the committed `pull-request.yml`.
- [ ] Every moved assertion is unchanged; the wiring test no longer holds
      them.
- [ ] The finders import only the shared readers, never `test-support/`.
- [ ] `npm run verify` is green.

---

## Phase 7: Daily problem finders, mutated

**User stories**: 29, 30, 31, 33

### What to build

The daily wiring finder and the mutation wiring finder each become the
module of their own gate folder, `dailyRun` and `dailyMutation`, beside the
test that moves their assertions and sample edits: `daily.yml`'s triggers
and jobs, the `daily` job, the `mutation` job and its report. Each keeps
its signature and its lines.

### Acceptance criteria

- [ ] A RED commit adds the two folders' tests, which fail because the
      finder modules do not exist yet.
- [ ] Each finder names the same lines for each sample edit as before and
      none for the committed `daily.yml`.
- [ ] Every moved assertion is unchanged; the wiring test no longer holds
      them.
- [ ] `npm run verify` is green.

---

## Phase 8: Secret scan and Electron install finders; the wiring test gone

**User stories**: 29, 30, 31, 33

### What to build

The secret scan finder and the Electron install finder each become the
module of their own gate folder, `secretScan` and `electronInstall`, with
their assertions moved unchanged; the Electron install check still checks
the install steps as 04 built them, and phase 12 changes it in its new
place (P2). With the last assertion moved, `gates/gateWiring/` is removed.

### Acceptance criteria

- [ ] A RED commit adds the two folders' tests, which fail because the
      finder modules do not exist yet.
- [ ] Each finder names the same lines for each sample edit as before and
      none for the committed workflows.
- [ ] `gates/gateWiring/` no longer exists; every one of its assertions is
      found in one of the ten folders.
- [ ] `npm run verify` is green.

---

## Phase 9: The Quarantine check takes today

**User stories**: 36, 37, 38

### What to build

The **Quarantine check** gets the shape the **Audit** has:
`checkQuarantine({ root, today, listTrackedPaths })` loads the
**Quarantine** under `root` and returns the violations, or the load
violation. Its entry only passes the working folder, today's UTC date and
git's tracked paths through the gate runner. Every date case moves from
the spawned entry tests to tests of the new function with fixed `today`
values; the entry tests keep only cases that do not depend on the date.

### Acceptance criteria

- [ ] A RED commit adds the new function's tests, which fail because it
      does not exist yet.
- [ ] Every date case runs with a fixed `today`: added later than today,
      expiry before added, expiry past 30 days, expired from the day after
      its **Expiry date**, a valid entry.
- [ ] The entry tests hold an empty passing **Quarantine**, an unreadable
      file, and the exit code and line format shown with a malformed entry,
      a cause that does not depend on the date (P4); no test reads the
      real clock.
- [ ] The entry holds no rule; messages and output are unchanged.
- [ ] `npm run verify` is green.

---

## Phase 10: Shared entry date rules

**User stories**: 34, 35

### What to build

The **Entry date rules** live once. A shared module returns the date
problems of one entry for given dates, today and limit: `is later than
today` on added, `is before added`, else `is more than <N> days after
added` on expires. The **Audit** calls it with 90, the **Quarantine
check** with 30; each turns a problem into its own violation and keeps its
own expiry line and its order of lines.

### Acceptance criteria

- [ ] A RED commit adds the shared module's tests, which fail because it
      does not exist yet.
- [ ] A table per rule, the limit on both sides, both limits.
- [ ] The **Audit**'s and the **Quarantine check**'s existing tests stay
      unchanged and green; neither writes the three rules out any more.
- [ ] `npm run verify` is green.

---

## Phase 11: The Playwright config in one call

**User stories**: 39, 40, 41

### What to build

The **Quarantine** reader exports `loadQuarantinePatterns(root)`, which
loads and reads the **Quarantine**, throws one error holding one
`<subject>: <reason>` line per violation, or returns the patterns. The
reporting module exports the one-line format that it and the gate reporter
share. `playwright.config.ts` sets `grepInvert` from one call of it and
holds no other code; its six keys and values stay.

### Acceptance criteria

- [ ] A RED commit adds the loader's tests, which fail because it does not
      exist yet.
- [ ] An unreadable file, a non-array and a malformed entry each throw with
      every line; a valid file returns the patterns.
- [ ] `test:e2e` still fails with one line per problem on a broken
      **Quarantine**; the end-to-end gate test's messages and key checks
      stay unchanged and green.
- [ ] The config defines no function of its own.
- [ ] `npm run verify:full` is green.

---

## Phase 12: npm ci installs the Electron binary

**User stories**: 42, 43, 44, 45, 46

### What to build

One mechanism installs the **Electron binary**: the root `postinstall`
script runs `install-electron`, so `npm ci` installs it on every machine
and fails when the download fails. The install steps go from the `verify`,
`pull-request` and `mutation` jobs, and the pinned command lists of those
jobs lose them. The Electron install check now requires `postinstall` to
be exactly `install-electron`, no workflow step to run it, and no
`ignore-scripts=true` line in `.npmrc` (A4). `README.md`'s Getting started
drops the manual line and says that `npm ci` installs the binary.

### Acceptance criteria

- [ ] A RED commit changes the Electron install check's tests and the
      pinned job commands, and fails on the current configuration.
- [ ] The check names a missing or different `postinstall`, every workflow
      step that runs `install-electron`, and an `ignore-scripts=true` line
      in `.npmrc`; it finds nothing in the committed files.
- [ ] The `verify`, `pull-request` and `mutation` jobs run `npm ci` and
      their tests with no install step between them.
- [ ] `README.md` no longer holds the manual line; `npm ci` carries the
      comment that it installs the **Electron binary**.
- [ ] `npm run verify:full` is green after `npm ci`.

---

## Phase 13: A configurable dev Debug port

**User stories**: 47, 48, 49, 50, 51, 52

### What to build

The developer can move the **Debug port**. In dev only, the debug port
module reads `DASHCASH_DEBUG_PORT`: unset or empty appends 9222, a whole
number from 1 to 65535 without leading zeros appends that port, anything
else appends nothing and returns the cause `DASHCASH_DEBUG_PORT must be a
whole number from 1 to 65535.`; outside dev it appends nothing whatever the
variable holds. The startup flow calls it right after the **Data folder**
and before the **Single-instance lock**; a cause ends in the **Startup
error** with the resolved **Data folder** in its last line. `README.md`'s
Getting started names the variable and its default in one line.

### Acceptance criteria

- [ ] A RED commit adds the port and startup tests, and fails on them.
- [ ] Outside dev, nothing is appended for any value; in dev, unset, empty,
      1, 9222 and 65535 append the expected port.
- [ ] 0, 65536, `09222`, `-1`, `92.5`, ` 9222` and `abc` each return the
      cause and append no switch.
- [ ] An invalid port shows the **Startup error** and takes no lock,
      registers no protocol and opens no **Database**; a valid one keeps
      the startup order of the header.
- [ ] `npm run dev` with another port exposes it on loopback (checked by
      hand, recorded in the ticket's Notes).
- [ ] `README.md` names `DASHCASH_DEBUG_PORT` and 9222 in one line.
- [ ] `npm run verify:full` is green.

---

## Phase 14: Ratchet the Break threshold

**User stories**: 53, 54, 55

### What to build

After every other change, the builder runs `npm run test:mutation` and sets
`thresholds.break` to the measured **Mutation score** rounded down; `high`
and `low` stay. A score below 81 is answered by tests for this feature's
**Surviving mutants** until it clears 81, never by a lower threshold (A5).
`gates/mutationTesting/` is unchanged, so this phase has no failing test
of its own (P3).

### Acceptance criteria

- [ ] `thresholds.break` is the measured score rounded down, at least 81;
      the score and the threshold are in the ticket's Notes.
- [ ] `high` stays 80 and `low` 60; `gates/mutationTesting/` is unchanged.
- [ ] The builder's run: `npm run test:mutation` exits 0 with the new
      threshold.
- [ ] `npm run verify` is green.

---

## Phase 15: The Dangerous-git hook judges the push part only (built by the human)

**User stories**: 56, 57, 58, 59, 60

### What to build

The human's ticket; the issue-loop stops here. The hook's `main` rule
splits a command at `&&`, `||`, `;`, `|` and line breaks and matches
`(:| )main( |$)` only against a part that runs `git push`; the branch rule
and every other pattern stay. A new gate test runs the hook as Claude Code
does, with invented commands, in a temporary git repository on a `feat/*`
branch and on `main`.

### Acceptance criteria

- [ ] A RED commit adds the hook's gate test, and the chained
      `git push -u origin feat/<x> && gh pr create --base main` case fails.
- [ ] From a `feat/*` branch that chain is allowed; `git push origin main`,
      `git push origin HEAD:main` and either inside a chain stay blocked.
- [ ] One case per existing pattern of the hook passes as before.
- [ ] `npm run verify` is green.
