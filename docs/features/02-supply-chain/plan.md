# Plan: 02 supply-chain

> Source PRD: `prd.md`. Decisions: `design-log.md` (Q1–Q50, A1–A13).
> Terms in bold are defined in `docs/ubiquitous-language.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: none. This feature has no React code.
- **IPC channels**: none. This feature has no main or renderer code.
- **Schema**: none. No database yet.
- **Public interface: npm scripts.** New: `check:licenses`, `check:audit`,
  `prepare`. `verify:full` and `check:pr` unchanged.
- **Verify order** (Q26), chained with `&&`: the nine 01 gates unchanged
  (`format:check` → `lint` → `typecheck` → `lint:deps` → `test` →
  `check:commits` → `check:tickets` → `check:data-files` →
  `check:docs-drift`), then `check:licenses`, then `check:audit` last. The
  gate wiring test pins the order as each gate joins.
- **Gate script shape** (01 Q21, A9): `scripts/<name>/<name>.ts` with its
  test beside it; a pure core (inputs in, `Violation[]` out) and a thin
  entry that reads files or runs a tool and ends through `runGate`. One
  `<subject>: <reason>` line per violation, exit 1; otherwise exit 0
  silently. New cores: `findLicenseViolations(lockfile, allowlist)`,
  `findAuditViolations(report, exceptions, today)` with `today` as
  `YYYY-MM-DD`, `cleanCommitMessage(raw)`.
- **Gate files under `quality/`**: the licence allowlist, a JSON array of
  SPDX ids; the audit exceptions file, a JSON array of
  `{ advisory, reason, expires }` keyed by GHSA id.
- **Workflows**: three files under `.github/workflows/`, one trigger kind
  each, no `if:` on any job, `ubuntu-latest`.
  - `name: CI`: `push` to `feat/**` and `refactor/**`; job `verify`.
  - `name: Pull request`: `pull_request` into `main`; job `pull-request`,
    the one **Required check**.
  - `name: Daily`: `schedule` `0 5 * * *` and `workflow_dispatch`; job
    `daily`.
  - Every job: checkout with full history, Node from `.nvmrc` with the npm
    cache, `npm ci`; the **Ruleset** stays unchanged.
- **Pinned actions** (Q9–Q11): every remote `uses:` is
  `<owner>/<repo>[/<path>]@<40 hex> # v<release>`; local `./…` actions are
  allowed. Every action added after the pinning phase lands pinned.
- **Secret scan** (Q27): `gitleaks/gitleaks-action`, pinned, as the step
  right after checkout in each job, with `GITHUB_TOKEN` from the workflow's
  secret and `GITLEAKS_ENABLE_COMMENTS: false`; default rules, no config
  file, no `.gitleaksignore` until a false positive appears.
- **Repository settings as code**: the existing apply script's repository
  `PATCH` carries the merge settings and `security_and_analysis`
  (secret scanning, push protection); only the human runs it.
- **Renovate**: `renovate.json` at the root, fixed commit messages
  `chore: [supply-chain] <description>` and fixed titles
  `chore: <description>`, default `renovate/` branch prefix.
- **Commit-msg hook**: a committed `.githooks/` folder, activated by
  `prepare` (`git config core.hooksPath .githooks`); the hook runs the
  commit-message entry with `node` directly.
- **Gate tests**: under `gates/<gate>/`, Vitest, offline, invented data,
  fixed dates. New: `pinnedActions`, `renovate`, `commitMsgHook`;
  extended: `gateWiring`, `ruleset`, `claudeFolderGuard`.
- **Built by the human**: the **Claude folder guard** under `.claude/`
  (Q47); the issue-loop stops at its phase.

---

## Phase 1: Pull-request workflow

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8

### What to build

The tracer bullet that rewires CI. The `pull-request` job moves verbatim
into a workflow of its own, `name: Pull request`, triggered only by pull
requests into `main`; the existing workflow keeps the name `CI`, only the
`push` trigger for `feat/**` and `refactor/**`, and only the `verify` job.
Both jobs lose their `if:`. The gate wiring and **Ruleset** tests read the
`pull-request` job from the new workflow, and gain two checks: the
pull-request workflow has no trigger besides `pull_request`, and across
every workflow file exactly one job reports as `pull-request`. The
**Ruleset** file is not touched.

### Acceptance criteria

- [ ] A push of the branch runs one workflow, `CI`, with one job `verify`,
      green; no `pull-request` job appears in the push run.
- [ ] The pull-request workflow's only trigger is `pull_request` into
      `main`; its job `pull-request` runs `npm run verify:full`, then
      `npm run check:pr` with `PR_TITLE` from the event, as in 01.
- [ ] No job in any workflow has an `if:`.
- [ ] The wiring test fails when the pull-request workflow gains another
      trigger, and when the push workflow gains a trigger other than `push`
      to the two branch patterns.
- [ ] The **Ruleset** test reads the job from the pull-request workflow and
      fails when a second workflow has a job reporting as `pull-request`.
- [ ] The **Ruleset** file is unchanged and still requires `pull-request`.
- [ ] `npm run verify` is green.

---

## Phase 2: Pinned actions

**User stories**: 9, 10, 11, 12

### What to build

Every `uses:` in both workflows is pinned to the full commit SHA of the
release its tag points to today, with that release as a trailing
`# v…` comment, looked up on GitHub when building. A gate test reads every
file under `.github/workflows/` as text and fails on any `uses:` that is
neither such a pin nor a local `./…` action, so a new workflow is covered
without changing the test.

### Acceptance criteria

- [ ] Every remote `uses:` names a 40-character hex SHA followed by
      `# v<release>`, the release the SHA belongs to.
- [ ] The gate test fails on a tag reference, a short SHA, a branch name
      and a pin without its comment, and passes a local `./…` action, each
      shown with invented workflow text.
- [ ] The gate test passes on the repository's workflows.
- [ ] CI's `verify` job is green with the pinned actions.

---

## Phase 3: License allowlist

**User stories**: 26, 27, 28, 29, 30, 31, 32, 33, 34

### What to build

The licence gate end to end: the **License allowlist** in `quality/` with
exactly today's eight SPDX ids, a gate script whose pure core judges every
installed package of the committed lockfile against it (the root,
**Workspace member** and link entries skipped; SPDX `OR`, `AND` and
parentheses evaluated, any other term compared whole), and a thin entry
that reads both files offline. `check:licenses` joins **Verify** after the
01 gates; the wiring test expects it there.

### Acceptance criteria

- [ ] The core's tests, on invented lockfiles, cover an allowed, a
      disallowed and a missing licence, a non-string and an empty licence,
      `OR`, `AND`, parentheses, a `WITH` term, an unreadable expression,
      nested `node_modules` entries, and the root, workspace-member and
      link entries skipped.
- [ ] A malformed allowlist (not an array, empty, a non-string or empty
      entry) is one violation naming the allowlist file.
- [ ] Each violation names `<name>@<version>` and its licence, or "has no
      licence".
- [ ] An allowed licence no package uses does not fail.
- [ ] `npm run check:licenses` passes on today's lockfile without
      `node_modules` and without the network.
- [ ] `verify` runs `check:licenses` right after `check:docs-drift`; the
      wiring test expects it there.
- [ ] CI's `verify` job is green.

---

## Phase 4: Audit

**User stories**: 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 34

### What to build

The **Audit** end to end: the audit exceptions file in `quality/` with the
exception for `GHSA-g3hv-75wg-m249` (expiring `2027-02-02`, with its
reason) and one of the same kind for any further **Advisory** open on the
day of building; a gate script whose pure core compares a version-2
`npm audit --json` report with the exceptions on a given day; and a thin
entry that runs `npm audit --json` through the npm that runs the script,
reads the file and passes today's UTC date. Every advisory of any
severity, dev dependencies included, needs exactly one valid **Audit
exception**; an expired, stale, duplicate or malformed exception fails, and
so does a report that cannot be read or an advisory without a GHSA id.
`check:audit` joins **Verify** last; the wiring test expects it there.

### Acceptance criteria

- [ ] The core's table tests, on invented reports and GHSA ids with fixed
      dates, cover: no advisories; an advisory with and without an
      exception; an exception on its **Expiry date** and the day after; a
      stale exception; two exceptions for one advisory; each malformed
      input (a missing or unparsable file, not an array, a missing or empty
      reason, a non-GHSA id, an expiry that is not a real `YYYY-MM-DD`
      date); a report without `vulnerabilities` or with an `error`; an
      advisory whose `url` holds no GHSA id; one advisory reaching several
      packages, reported once.
- [ ] Each violation is one line: the GHSA id with severity, title and
      affected packages, or the expired date, or the stale exception; the
      exceptions file with the entry's index and field; `npm audit` when
      the report cannot be read.
- [ ] The entry fails with a message to run `npm run check:audit` when it
      is not started by npm, and when `npm audit` produces no JSON report.
- [ ] Tests never run the entry or touch the network.
- [ ] `npm run check:audit` passes on the day of building.
- [ ] `verify` runs `check:audit` last, after `check:licenses`; the wiring
      test expects it there.
- [ ] CI's `verify` job is green.

---

## Phase 5: Daily run

**User stories**: 8, 41, 42, 43, 44

### What to build

The **Daily run** workflow, `name: Daily`, with one job `daily` on a
`schedule` of `0 5 * * *` and on `workflow_dispatch`: checkout with full
history, Node from `.nvmrc` with the npm cache, `npm ci`,
`npm run check:audit`, its actions pinned from the start. The wiring test
fails when the workflow loses its schedule, its manual trigger, the full
history or the **Audit**. The pinned-actions and **Ruleset** tests cover
the new file without change.

### Acceptance criteria

- [ ] The daily workflow's triggers are exactly the schedule and
      `workflow_dispatch`; its one job runs `npm run check:audit` and
      nothing of **Verify** besides.
- [ ] The wiring test fails when the schedule, the manual trigger, the
      full-history checkout or the audit step is removed.
- [ ] The pinned-actions test and the single-`pull-request`-job check pass
      with the new workflow.
- [ ] `npm run verify` and CI's `verify` job are green.

---

## Phase 6: Secret scan

**User stories**: 35, 36, 37, 38, 40, 44

### What to build

The **Secret scan** in CI: the gitleaks action, pinned, as the step right
after checkout in the `verify`, `pull-request` and `daily` jobs, with the
workflow's `GITHUB_TOKEN` and PR comments off, default rules and no config
or ignore file. On push it scans the pushed commits, on a pull request the
PR's commits, in the **Daily run** the whole history. The wiring test fails
when any of the three jobs loses the step, runs it before checkout, or
turns comments on.

### Acceptance criteria

- [ ] Each of the three jobs runs gitleaks after checkout and before
      setup-node, with `GITLEAKS_ENABLE_COMMENTS` `false`.
- [ ] No gitleaks config file and no `.gitleaksignore` exist.
- [ ] The wiring test fails for each job when its gitleaks step is
      removed, moved before checkout or has comments enabled.
- [ ] The pinned-actions test passes with the gitleaks action.
- [ ] A push of the branch runs gitleaks green over the branch in CI's
      `verify` job.

---

## Phase 7: Push protection

**User stories**: 39

### What to build

GitHub secret scanning with **Push protection** as repository settings in
code: the repository `PATCH` that the apply script already plans gains
`security_and_analysis` with `secret_scanning` and
`secret_scanning_push_protection`, both enabled, beside the merge settings.
The script keeps its name and is still run only by the human.

### Acceptance criteria

- [ ] The request-planning tests show the repository patch carrying both
      secret-scanning settings beside the merge settings, for both the
      create and the update path.
- [ ] Every other planned request is unchanged.
- [ ] `npm run verify` and CI's `verify` job are green.

---

## Phase 8: Renovate

**User stories**: 45, 46, 47, 48, 49, 50, 51, 52

### What to build

`renovate.json` at the root: `config:recommended`,
`helpers:pinGitHubActionDigests` and `:disableDependencyDashboard`;
`semanticCommits` disabled, no `commitBody`, no automerge, a three-day
minimum release age, `before 6am on monday` in `Europe/Berlin`, the default
`renovate/` branch prefix; one group each for npm packages, GitHub
Actions, Node (`.nvmrc` and `engines.node` together), lockfile maintenance
and vulnerability alerts, each with its fixed commit message and PR title
from Q36 and no `[SECURITY]` suffix. A gate test reads the config and
fails when any message fails the loaded commitlint config, does not name
`supply-chain` or holds `{{`, when any title fails the **Pull-request
check** on a `renovate/*` branch, when the Node rule stops covering both
files, or when a setting above changes. No `renovate` package and no
validator.

### Acceptance criteria

- [ ] Every commit message is fixed text `chore: [supply-chain] …` and
      passes the commitlint config through its Node API.
- [ ] Every PR title is fixed text `chore: …` and passes the
      **Pull-request check** core on a `renovate/*` branch.
- [ ] The gate test fails for a templated message, a message naming
      another feature, a title the check rejects, a Node rule covering
      only one of the two files, and each changed setting of story 51.
- [ ] No dependency is added.
- [ ] `npm run verify` and CI's `verify` job are green.

---

## Phase 9: Commit-msg hook

**User stories**: 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63

### What to build

The **Commit-msg hook** end to end: a commit-message entry whose pure core
cleans the raw message the way git's default cleanup does (CRLF, the
scissors line and what follows, `#` lines, trailing whitespace, blank
lines), then lints the result with the existing commitlint module and
config and reports through `runGate`; an empty result exits 0 so git
aborts with its own message, a missing argument or unreadable file exits 1
with one line. The committed hooks folder holds one executable `sh` hook
that runs the entry with `node` and `"$1"`; `prepare` points
`core.hooksPath` at the folder on every `npm ci` and `npm install`. A gate
test pins the hook's mode, shebang, command and the `prepare` script, and
drives the hook with `sh` on temporary message files.
`docs/conventions.md` gains the hooks folder in its Folder structure.

### Acceptance criteria

- [ ] The cleaning core's tests cover comment lines, the scissors line,
      CRLF, trailing whitespace, consecutive and surrounding blank lines and
      an all-comment message.
- [ ] Driven with `sh` from the repository root, the hook exits 0 for a
      valid header, for a merge, revert and `fixup!` message and for an
      empty message, and exits 1 with one line per violation for an
      invalid header, a header with `@` or `#`, a 51-character description
      and a body.
- [ ] The hook never runs the **Ticket check**, the **Branch range** or
      git history, and needs no `origin/main`.
- [ ] The gate test fails when the hook loses mode `100755`, its shebang,
      its command or `"$1"`, or when `prepare` changes.
- [ ] After `npm ci`, `git config core.hooksPath` reads `.githooks`.
- [ ] `docs/conventions.md` lists the hooks folder, and the docs-drift
      gate passes.
- [ ] `npm run verify` and CI's `verify` job are green.

---

## Phase 10: Claude folder guard for the Home settings (built by the human)

**User stories**: 64, 65, 66, 67, 68, 69, 70

### What to build

The **Claude folder guard** also refuses an agent's `Edit` and `Write` of
the **Home settings**: the hook's node judge receives the home folder
(`HOME`, else `USERPROFILE`) on standard input, normalises it like the
project root, resolves `~/` and `~\` against it, and blocks a path equal
to `<home>/.claude/settings.json`; with neither variable set, only the
project rule applies. The Bash rule is unchanged. The guard's gate test
gains Q48's cases with invented home folders. Everything under `.claude/`
is the human's: the issue-loop stops at this phase.

### Acceptance criteria

- [ ] `Edit` and `Write` of the **Home settings** as a POSIX, Windows, Git
      Bash and `~/` path exit 2.
- [ ] A memory file under the home `.claude/projects/`, a
      `settings.json.bak` beside the **Home settings** and a
      `.claude/settings.json` under another home subfolder exit 0.
- [ ] Bash commands naming `~/.claude/settings.json` and
      `$HOME/.claude/settings.json` exit 2.
- [ ] With neither `HOME` nor `USERPROFILE` set, the home rule is skipped
      and the project rule still blocks.
- [ ] Every existing guard case keeps its exit code.
- [ ] `npm run verify` and CI's `verify` job are green.
- [ ] Handover note, not a criterion: after the merge the human runs the
      apply script again (push protection), installs the Renovate GitHub
      App on the repository, and starts the **Daily run** once with
      `workflow_dispatch` (story 70).
