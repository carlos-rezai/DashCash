# PRD: 05 gate-maintenance

> Source: `design-log.md` (Grill-me, 2026-11-15, Q1–Q36; Assumptions from
> write-a-prd, A1–A8). Terms in bold are defined in
> `docs/ubiquitous-language.md`.

## Problem Statement

Features 01 to 04 built **Verify**, the supply-chain gates, **Mutation
testing** and the desktop shell. Their reviews and refactor plans left
findings that change behaviour or gate files, so no **Refactor step** could
take them. Left alone, each one weakens a promise the gates make:

- The **App protocol** checks only the path of a request: `app://other/`
  is served the renderer files like `app://dashcash/`, although the origin
  matcher refuses such a page everywhere else.
- A quarantined **Flaky test** still runs when it carries a tag, and a
  quarantined spec in a subfolder of `e2e/` is left out on Linux but run on
  Windows. Both bugs passed because the gate test checked a hand-made model
  of the string Playwright matches, not Playwright itself.
- `renovate.json` writes whole commit messages and PR titles, which
  Renovate has deprecated, and nothing keeps Renovate from proposing a Node
  major, a TypeScript major that typescript-eslint cannot read yet, or an
  `@types/node` ahead of the runtime in `.nvmrc`.
- The **Problem finders** of the **Gate wiring** live inside one 1368-line
  test file, which **Mutation testing** never mutates, so nobody learns when
  a finder is untested. The **Audit** and the **Quarantine check** each
  write out the same date rules, and only the **Audit** takes today as a
  parameter; the **Quarantine check**'s tests depend on the real clock.
  `playwright.config.ts` repeats the reader's loading and error handling.
- A fresh checkout's first test downloads the **Electron binary** unless the
  developer remembers a manual step, and the dev **Debug port** is fixed at
  9222, which another program on the developer's machine already held.
- The **Break threshold** sits at 81 while the measured **Mutation score**
  is above 82, so the ratchet lags.
- The **Dangerous-git hook** blocks `git push … && gh pr create --base
  main` from a feature branch, because it matches `main` anywhere in a
  command that contains `git push`.

## Solution

Gate maintenance, row 05 of `docs/feature-checklist.md`, in seven parts,
most important first. No screen changes, no domain code, no **End-to-end
test** is added or changed.

1. **Security.** The **App protocol** serves only the host `dashcash`:
   another host, a port or user info is answered 404, like a path outside
   the renderer folder. The failing test comes first.
2. **Quarantine bugs.** A **Quarantine pattern** accepts the test's tags
   after its title and either path separator in its file, and a gate test
   runs Playwright's own `--list` in a sample tree to prove that quarantined
   tests, tagged or in a subfolder, are left out.
3. **Renovate.** `renovate.json` sets only **Commit-message parts**; the
   five titles stay exactly as they are. Three **Hold rules** keep back Node
   majors, TypeScript majors and any `@types/node` beyond the major in
   `.nvmrc`. The Renovate gate checks the parts, the assembled titles and the
   hold rules.
4. **Structure.** The gate wiring test is split by what it checks, one gate
   folder each, and each **Problem finder** becomes the module beside its
   test, so **Mutation testing** mutates it; the workflow readers move to
   `scripts/`. The **Audit** and the **Quarantine check** share one module
   for the **Entry date rules**, and both take today as a parameter. The
   Playwright config gets its patterns from one call of the shared
   **Quarantine** reader.
5. **Local setup.** `npm ci` installs the **Electron binary** through the
   root `postinstall` script, everywhere, so the CI install steps and the
   README's manual line go. `DASHCASH_DEBUG_PORT` moves the dev **Debug
   port**; an invalid value ends in the **Startup error**.
6. **Ratchet.** After every other change, the **Break threshold** rises to
   the measured **Mutation score**, rounded down.
7. **Built by the human.** The **Dangerous-git hook** judges only the
   `git push` part of a command, with a gate test that runs it.

The feature numbers of the planned features after 05 were already moved up
by one in the planning commit (design log Q1–Q2).

## User Stories

**App protocol**

1. As the user, I want a request to `app://<any host but dashcash>/…`
   answered as not found, so that a page on another `app://` host can never
   read the app's renderer files.
2. As the user, I want a request to `app://dashcash` with a port, such as
   `app://dashcash:8080/index.html`, answered as not found, so that no
   look-alike origin is served.
3. As the user, I want a request with user info, such as
   `app://x@dashcash/index.html`, answered as not found, so that the
   protocol trusts exactly the origins the **Sender check** trusts.
4. As the user, I want a request with an empty host, or a host spelled in
   other letter case where the URL parser keeps it, answered as not found,
   so that only the exact host `dashcash` is served.
5. As the user, I want every request to `app://dashcash/<file inside the
   renderer folder>` still served, so that the app keeps working.
6. As the user, I want the path rules unchanged (`..`, encoded `..`,
   absolute paths, another drive), so that the host check adds to the
   protection and takes nothing away.
7. As the repository owner, I want the host cases in the same refused-URL
   table that drives both the path function's test and the handler's test,
   so that each new case fails in both places.
8. As the repository owner, I want this fix's failing tests committed first,
   so that the gap is shown before it is closed.

**Quarantine patterns**

9. As the developer, I want a quarantined test that carries tags (`{ tag:
   '@slow' }`) left out of the end-to-end run, so that a tag never brings a
   **Flaky test** back.
10. As the developer, I want a quarantined test whose title itself holds a
    tag, such as `Start the app @slow`, left out too, so that a tag in the
    title is no loophole either.
11. As the developer, I want a quarantined spec in a subfolder of `e2e/`
    left out on both Linux and Windows, so that CI and my machine run the
    same tests.
12. As the developer, I want the **Quarantine entry** to keep naming its
    file with `/`, so that the **Quarantine check** still compares it with
    git's tracked paths.
13. As the developer, I want an entry still to leave out only its own test:
    not the same title in another file, not a title that merely starts with
    it, and with regex characters in the title matched literally, so that a
    quarantine never hides another test.
14. As the repository owner, I want a gate test that runs Playwright's own
    `playwright test --list` with the committed config in a sample tree
    holding invented specs and an invented **Quarantine**, and checks which
    tests are listed, so that the proof is Playwright's matching, not a
    model of it.
15. As the repository owner, I want that gate test to start no app, no
    browser and no network, so that it stays fast and runs inside **Verify**.

**Renovate**

16. As the repository owner, I want `renovate.json` to set no
    `commitMessage` and no `prTitle` anywhere, so that the config uses only
    options Renovate supports.
17. As the repository owner, I want the root to set the prefix
    `chore: [supply-chain]` and every PR-opening scope its own action,
    extra and suffix, so that no scope falls back to Renovate's wording or
    a version number.
18. As the repository owner, I want the five **Renovate PR** titles to stay
    exactly `chore: [supply-chain] update npm dependencies`, `… update
    github actions`, `… update node`, `… refresh the lockfile` and `… fix
    vulnerable dependencies`, so that the commit gate and the
    **Pull-request check** accept them as before.
19. As the repository owner, I want no package name or version in any title,
    so that a title fits the **Commit header** format.
20. As the repository owner, I want Renovate never to propose an
    `@types/node` whose major differs from the Node major in `.nvmrc`, so
    that the types never describe a runtime the app does not run on.
21. As the repository owner, I want the Renovate gate to fail when the
    `@types/node` cap's major and the major in `.nvmrc` differ, so that
    moving to a new Node major moves the cap in the same change.
22. As the repository owner, I want TypeScript majors held, so that
    Renovate does not open a PR that typescript-eslint's peer range would
    fail anyway.
23. As the human, I want TypeScript minors and patches still proposed, so
    that only the major waits for typescript-eslint.
24. As the repository owner, I want Node majors disabled in both `.nvmrc`
    and `engines.node`, so that a new Node major is a decision, not a
    Monday PR.
25. As the developer, I want Node minors and patches still grouped into the
    one `update node` PR, so that the runtime keeps its fixes.
26. As the repository owner, I want the Renovate gate to assemble each
    PR-opening scope's title the way Renovate's default template does and
    run it through commitlint and the **Pull-request check**, so that a
    wrong part fails before Renovate ever uses it.
27. As the repository owner, I want the gate to fail on a template (`{{`)
    in any part, on a scope that leaves its action or extra to Renovate and
    on a group rule that sets its own topic, so that each title has exactly
    one source.
28. As the repository owner, I want the hold rules last, after the Node
    rule, and none of them reaching lockfile maintenance, so that later
    rules win as intended and the lockfile refresh keeps running.

**Gate wiring split**

29. As the repository owner, I want each part of the **Gate wiring**
    checked in its own gate folder (verify scripts, push workflow,
    pull-request workflow, pull-request sandbox, pull-request mutation,
    daily run, daily mutation, secret scan, Electron install, rules over
    every workflow), so that a failing wiring test names its part by its
    folder.
30. As the repository owner, I want each **Problem finder** to be the
    module beside its test, so that **Mutation testing** mutates it and an
    untested line shows as a **Surviving mutant**.
31. As the repository owner, I want every assertion of the old wiring test
    kept, so that the split loosens nothing.
32. As the developer, I want the workflow readers (read a workflow, list the
    workflow files, triggers, a job's steps and commands, splitting `&&`
    chains, the jobs running a command) in one shared module in `scripts/`
    with its own tests, so that the finders, as **Shipping code**, never
    import `test-support/`.
33. As the developer, I want the workflow edits that only tests use kept
    beside their test, or in `gates/test-support/` when two tests share
    one, so that no test helper ships.

**Entry date rules and today**

34. As the developer, I want the **Entry date rules** (added no later than
    today, expiry not before added, expiry at most the limit after added)
    in one shared module, so that the **Audit** and the **Quarantine
    check** cannot drift apart.
35. As the developer, I want each check to keep its own limit (90 and 30
    days), its own messages, its own expiry line and its order of lines, so
    that their output is unchanged.
36. As the developer, I want the **Quarantine check** to take today as a
    parameter, as the **Audit** does, so that its tests run on a fixed
    clock.
37. As the developer, I want the **Quarantine check**'s entry to pass only
    today's UTC date, git's tracked paths and the working folder, so that
    the entry holds no rule.
38. As the developer, I want the spawned entry tests to keep only cases
    that do not depend on the date, so that no test changes its result with
    the day it runs.

**Playwright config**

39. As the developer, I want the Playwright config's `grepInvert` to come
    from one call of the shared **Quarantine** reader, so that loading,
    reading and the error message live in one place.
40. As the repository owner, I want `test:e2e` still to fail with one
    `<subject>: <reason>` line per problem when the **Quarantine** cannot be
    read or is malformed, so that a broken file never runs or skips tests
    silently.
41. As the repository owner, I want the config's six keys and values
    unchanged, so that the end-to-end gate test still pins the harness.

**Electron binary**

42. As the developer, I want `npm ci` to install the **Electron binary**
    on my machine, so that no test of a fresh checkout downloads it.
43. As the developer, I want a failed download to fail `npm ci`, so that I
    learn of it before any test.
44. As the repository owner, I want CI's separate install steps removed and
    the Electron install check to require the root `postinstall` script to
    be exactly `install-electron` and no workflow step to run it, so that
    one mechanism is checked in one place.
45. As the repository owner, I want the Electron install check to fail when
    `.npmrc` turns lifecycle scripts off, so that `npm ci` cannot skip the
    install silently.
46. As the developer, I want `README.md`'s Getting started without the
    manual install line and saying that `npm ci` installs the binary, so
    that the setup steps are the ones that work.

**Debug port**

47. As the developer, I want `DASHCASH_DEBUG_PORT` to set the **Debug
    port** of `npm run dev`, so that a port held by another program no
    longer stops DevTools tools from attaching.
48. As the developer, I want an unset or empty variable to mean 9222, so
    that nothing changes for anyone who does not set it.
49. As the developer, I want a value that is not a whole number from 1 to
    65535 without leading zeros to end in the **Startup error** with
    `DASHCASH_DEBUG_PORT must be a whole number from 1 to 65535.`, so that
    a typo never gives a different port silently.
50. As the developer, I want the invalid port caught before the
    **Single-instance lock**, the **App protocol** or the **Database** are
    touched, so that a failed start leaves nothing behind.
51. As the user, I want the variable ignored outside `npm run dev`, so that
    the **App build** and the packaged app never open a **Debug port**,
    whatever the environment says.
52. As the developer, I want `README.md`'s Getting started to name the
    variable and its default in one line, so that I find it without reading
    the code.

**Ratchet**

53. As the repository owner, I want the **Break threshold** raised to the
    measured **Mutation score**, rounded down, after every other change of
    this feature, so that the ratchet keeps up with the tests.
54. As the repository owner, I want the measured score recorded in the
    ticket's Notes, so that the new threshold has its evidence.
55. As the repository owner, I want a score that falls below 81 answered by
    tests for this feature's **Surviving mutants**, never by a lower
    threshold, so that the ratchet only goes up.

**Dangerous-git hook (built by the human)**

56. As the agent, I want `git push -u origin feat/<x> && gh pr create
    --base main` allowed from a feature branch, so that I can push and open
    a PR in one command.
57. As the repository owner, I want `git push origin main`, `git push
    origin HEAD:main` and either of them inside a chain still blocked, so
    that the hook still keeps agents off `main`.
58. As the repository owner, I want every other rule of the hook unchanged,
    so that the fix opens nothing else.
59. As the repository owner, I want a gate test that runs the hook with
    invented commands in a temporary git repository, on a `feat/*` branch
    and on `main`, so that the hook's behaviour is pinned for the first
    time.

**Planning and process**

60. As the human, I want `/feature-pipeline` to pause after planning, since
    the tickets name gate files and one ticket is mine, so that I approve
    them first.
61. As the human, I want to check the titles of the first **Renovate PRs**
    of each kind after the merge, so that the modelled titles are confirmed
    by Renovate itself.

## Implementation Decisions

Paths and the change per path are in the design log's Design table; this
section names modules and their interfaces.

**App protocol** (Q5–Q7)

- `resolveRendererPath(rendererFolder, url)` returns `undefined` for any URL
  whose parsed host is not exactly `dashcash` (the host includes a port, so
  a port is refused) or that holds user info, before the path rules. Its
  comment names the new refusals; `serveAppProtocol` keeps its single 404
  path.
- `matchAppOrigin/` is not imported (it imports `APP_ORIGIN` from here).

**Quarantine reader** (Q8–Q12, Q25)

- `buildQuarantinePatterns(entries)`: per entry
  `(?:^| )<file> <title>(?: @\S+)*$`, with the file relative to `e2e/`,
  every `/` written as `[\\/]`, file and title otherwise escaped literally.
- `loadQuarantinePatterns(root: string): RegExp[]`: loads and reads the
  **Quarantine**; on a load failure or any shape violation it throws one
  error whose message holds one `<subject>: <reason>` line per violation;
  otherwise returns the patterns.
- The reporting module exports the one-line format (`<subject>: <reason>`)
  that both `reportViolations` and `loadQuarantinePatterns` use.
- `playwright.config.ts`: `grepInvert: loadQuarantinePatterns(process.cwd())`,
  no other code; its six keys unchanged.
- The **Quarantine check**'s file rule is unchanged.

**Entry date rules and the Quarantine check** (Q23–Q24)

- `findEntryDateProblems(dates: { added: number; expires: number }, today:
  number, maxDays: number): EntryDateProblem[]`, with `EntryDateProblem =
  { field: 'added' | 'expires'; why: string }`: `is later than today`
  (added), `is before added`, else `is more than <N> days after added`
  (expires). Dates arrive already read by `readCalendarDate`.
- The **Audit** and the **Quarantine check** call it with 90 and 30 and turn
  each problem into their own `entry <i>, field <f>: <why>` violation; each
  keeps its own expiry line and its order of lines.
- `checkQuarantine({ root, today, listTrackedPaths }): Violation[]`: loads
  the **Quarantine** under `root` and returns `findQuarantineViolations`'
  result, or the load violation. `today` is `YYYY-MM-DD`;
  `listTrackedPaths(root)` returns git's tracked paths. The entry passes
  `process.cwd()`, today's UTC date and the git reader through `runGate`.

**Workflow readers and Problem finders** (Q20–Q22, A2, A8)

- `scripts/readWorkflow/` exports the `Workflow` and `WorkflowStep` types and
  the readers: read one workflow file, list the workflow files, triggers, a
  job's steps, a job's commands, split an `&&` chain, list the jobs whose
  commands run a given command. The readers that touch the file system take
  the repository root as a parameter (A2).
- One gate folder per part of the **Gate wiring**, as the design log's Q20
  table lists: `verifyScripts`, `pushWorkflow`, `pullRequestWorkflow`,
  `pullRequestSandbox`, `pullRequestMutation`, `dailyRun`, `dailyMutation`,
  `secretScan`, `electronInstall`, `workflows`. Six of them hold a
  **Problem finder** module beside the test: `findPullRequestSandboxProblems`,
  `findPullRequestMutationProblems`, `findDailyWiringProblems`,
  `findMutationWiringProblems`, `findSecretScanProblems`,
  `findElectronInstallProblems`. Each finder keeps its current signature and
  returns one line per problem (`string[]`), except the Electron install
  finder (below).
- `gates/gateWiring/` is removed; every assertion moves unchanged, apart
  from the Electron install ones that Q26 replaces.
- Workflow edits used by one test stay beside it; one used by two tests
  goes to `gates/test-support/`.
- The Stryker exclude list does not change.

**Renovate** (Q13–Q19, A3)

- `renovate.json`: the root sets `commitMessagePrefix: "chore:
  [supply-chain]"`; the npm group's `groupName` becomes `npm dependencies`;
  each of the three group rules, `lockFileMaintenance` and
  `vulnerabilityAlerts` sets `commitMessageAction` (lower case),
  `commitMessageExtra: ""` and `commitMessageSuffix: ""`; lockfile
  maintenance (`the lockfile`) and vulnerability alerts (`vulnerable
  dependencies`) set `commitMessageTopic`; group rules set none.
- Three **Hold rules** after the Node rule, in this order: `@types/node`
  (npm) with `allowedVersions: "<major>.x"`; `typescript` (npm) majors with
  `enabled: false`; `node` (nvm and npm) majors with `enabled: false`.
- `findRenovateViolations(config, commitConfig, nodeVersion)`: the third
  parameter is the text of `.nvmrc` (A3). New checks: no `commitMessage` or
  `prTitle` anywhere; no `{{` in any part; each PR-opening scope sets its
  action and extra, a group rule no topic; each assembled title (prefix,
  action, topic or `groupName`, extra, suffix; trimmed, inner whitespace
  collapsed) passes commitlint, names the feature `supply-chain` and passes
  the **Pull-request check**; the `@types/node` cap's major equals the major
  in `nodeVersion`; the TypeScript and Node holds exist. The order check
  becomes: the Node rule comes after every other npm rule except the hold
  rules, and every hold rule (recognised by `enabled: false` or
  `allowedVersions`) comes after it. The existing checks on base settings,
  lockfile maintenance and vulnerability alerts stay; "a PR title is the same
  text as its commit message" goes.

**Electron binary** (Q26–Q27, A4)

- Root `package.json`: `"postinstall": "install-electron"`.
- The `install-electron` steps go from the `verify`, `pull-request` and
  `mutation` jobs; the pinned command lists of those jobs lose the step.
- `findElectronInstallProblems(scripts, workflows, npmrc)`: names a
  `postinstall` that is not exactly `install-electron`, every workflow step
  that runs `install-electron`, and an `ignore-scripts=true` line in
  `.npmrc` (A4). `scripts` is `package.json`'s scripts, `workflows` the
  parsed workflows by file name, `npmrc` the text of `.npmrc` or empty when
  it is missing.
- `README.md`, Getting started: the manual line goes; `npm ci` gets a
  comment that it installs the **Electron binary**.

**Debug port** (Q28–Q29, A1)

- `enableDebugPort(app, env): { cause: string } | undefined`: in dev only
  (`readDevServerUrl` defined), reads `DASHCASH_DEBUG_PORT`; unset or empty
  appends `remote-debugging-port=9222`; `^[1-9]\d{0,4}$` with a value up to
  65535 appends that port; anything else appends nothing and returns the
  cause `DASHCASH_DEBUG_PORT must be a whole number from 1 to 65535.`
  Outside dev it appends nothing and returns `undefined`, whatever the
  variable holds.
- `startApp` calls it right after resolving the **Data folder**, before the
  **Single-instance lock** (A1); a cause shows the **Startup error** with
  the resolved **Data folder** in its last line, and startup stops.
  `showStartupError` is unchanged.
- `README.md`, Getting started: one line naming `DASHCASH_DEBUG_PORT` and
  its default 9222.

**Ratchet** (Q30–Q31, A5)

- `stryker.config.js`: `thresholds.break` becomes the measured **Mutation
  score** rounded down; `high` 80 and `low` 60 stay.
  `gates/mutationTesting/` is unchanged.

**Dangerous-git hook** (Q32–Q33)

- The `main` rule splits a command at `&&`, `||`, `;`, `|` and line breaks
  and matches `(:| )main( |$)` only against a part that runs `git push`.
  The branch rule and every other pattern stay.
- `gates/dangerousGitGuard/dangerousGitGuard.test.ts` runs the hook as
  Claude Code does, with invented commands, in a temporary git repository
  on a `feat/*` branch and on `main`.

**Gate files the tickets name** (Q34)

`playwright.config.ts`, `stryker.config.js`, `.github/workflows/ci.yml`,
`.github/workflows/pull-request.yml`, `.github/workflows/daily.yml`,
`package.json`, and the tests under `gates/` that change or join
(`endToEnd/`, `renovate/`, the ten wiring folders, `gates/test-support/`,
`gateWiring/` removed). The human's ticket names `.claude/hooks/` and
`gates/dangerousGitGuard/`. So `/feature-pipeline` pauses after planning
for the human's `go`.

**Ticket order** (design log, Implementation Plan; A6)

1. App protocol host, failing test first.
2. Quarantine patterns and the `--list` gate test.
3. Renovate: parts, holds and the gate.
4. Structure, cut thin: the workflow readers; the wiring split in several
   tickets by folder; the shared date rules with `checkQuarantine`; the
   Playwright config through `loadQuarantinePatterns`.
5. Local setup: `postinstall` and the Electron install check; the
   **Debug port**.
6. Ratchet: last ticket the issue-loop builds.
7. Dangerous-git hook: the human's ticket, after the ratchet; the
   issue-loop stops there.

## Testing Decisions

- A good test drives a module through its public interface and asserts
  what it does: the value a pure function returns, the switches appended to
  a fake `app`, the calls `startApp` makes on its fake Electron objects, the
  violations of a gate core, the problem lines of a finder for a sample
  workflow, the tests Playwright lists, the exit code and lines of a gate
  entry. It never asserts on internals.
- No domain code and no component: no domain test, no story (Q4). No
  **End-to-end test** is added or changed (Q4).
- Vitest, main process:
  - `resolveRendererPath` and `serveAppProtocol`: the refused-URL table
    gains another host, a port, user info, an empty host and an upper-case
    host; every existing served and refused case stays. RED first (Q7).
  - `enableDebugPort`: outside dev nothing for every value; in dev unset,
    empty, 1, 9222, 65535; refused 0, 65536, `09222`, `-1`, `92.5`,
    ` 9222`, `abc`, each with the cause and no switch.
  - `startApp`: an invalid port shows the **Startup error** and takes no
    lock, registers no protocol and opens no **Database**; a valid one keeps
    today's order.
- Vitest, gate code (mutated by **Mutation testing**):
  - `buildQuarantinePatterns`: `/` and `\` both match a subfolder entry;
    tags after the title match, none and several; a tag in the title; the
    same title in another file, a longer title and regex characters do not
    match.
  - `loadQuarantinePatterns`: an unreadable file, a non-array and a
    malformed entry each throw with every line; a valid file returns the
    patterns.
  - `findEntryDateProblems`: a table per rule, the limit on both sides, both
    limits.
  - `checkQuarantine`: every date case with fixed `today` values, moved out
    of the spawned entry tests; the entry tests keep an empty passing
    **Quarantine**, an unreadable file, and the exit code and line format.
  - The **Audit**'s existing tests stay unchanged and green.
  - `scripts/readWorkflow/`: each reader on invented workflow text.
  - Each **Problem finder**: the lines it names for each sample edit, and
    none for the committed workflows, carried over from the old wiring test.
  - `findRenovateViolations`: the committed config passes; each new rule
    has a failing sample (a `commitMessage`, a `prTitle`, a template in a
    part, a missing action or extra, a group topic, a title that fails
    commitlint, a cap one major off `.nvmrc`, a missing hold, a hold before
    the Node rule).
- Gate tests:
  - `gates/endToEnd/`: the committed config's keys and values; a new test
    runs `playwright test --list` in a sample tree (`installGateScripts`)
    with the committed config, an invented spec in `e2e/sub/` holding a
    tagged and an untagged quarantined test and a third test, the cases of
    the old hand-made model in a top-level spec, and an invented
    **Quarantine**; it checks the listed tests on the platform it runs on
    (A7).
  - The ten wiring folders: the old assertions, each in its folder.
  - `gates/renovate/`: the committed `renovate.json` and `.nvmrc` pass.
  - `gates/dangerousGitGuard/`: the cases of Q32 plus one per existing
    pattern (human's ticket).
- The ratchet ticket runs `npm run test:mutation` once all else is done
  (A5).
- Deterministic: fixed dates in every date test, invented workflows,
  entries, specs and commands, temporary folders, no network.
- The same agents write the code and its tests through the issue-loop's
  RED and GREEN steps (`CLAUDE.md`, Tests).
- Prior art: `gates/renovate/` and `gates/mutationTesting/` (a gate module
  beside its test); the gate wiring test's sample edits and finders; the
  end-to-end gate test's sample tree that imports the config in a fresh
  process; `checkAudit({ today, … })` and its fixed-date tests;
  `scripts/test-support/sampleRepository/` for temporary repositories;
  `gates/claudeFolderGuard/` for running a Claude Code hook from a test.

## Out of Scope

- Describe titles and describe-level tags in a **Quarantine entry** (Q9).
- A gate that pins "the **Break threshold** only goes up"; Stryker's `high`
  and `low` (Q31).
- The reviewer's DevTools MCP and its port configuration (07 app-shell,
  Q29).
- Moving the `node:sqlite` probe (04 refactor plan, Further Notes).
- Any change to the **Quarantine check**'s rules or messages, the
  **Audit**'s rules or messages, or the **App protocol**'s path rules.
- New dependencies or updates (Q35).
- A Renovate config validator (02, A12).

## Further Notes

- The `daily` job, which runs no tests, now downloads Electron in `npm ci`,
  and every `npm install` checks the binary (Trade-offs).
- Renovate runs its own installs with lifecycle scripts off, so
  `postinstall` does not run in Renovate's environment; the **Renovate PR**'s
  CI runs `npm ci` with it.
- A quarantine entry's title also leaves out the same title with extra
  tags in the same file (Trade-offs).
- The TypeScript **Hold rule** is lifted by a human ticket once a
  typescript-eslint release's peer range includes the new major.
- Manual steps after the merge (Q36): the titles of the first **Renovate
  PRs** of each kind; one fresh clone's `npm ci` shows the Electron
  download once.
- A PR description lists the design log's assumptions under "Assumptions"
  (`docs/conventions.md`).
