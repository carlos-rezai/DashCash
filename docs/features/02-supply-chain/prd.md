# PRD: 02 supply-chain

> Source: `design-log.md` (Grill-me, 2026-11-02, Q1–Q50; Assumptions from
> write-a-prd, A1–A13). Terms in bold are defined in
> `docs/ubiquitous-language.md`.

## Problem Statement

Feature 01 made **Verify** and the **Required check** binding, but
everything the repository pulls in from outside is still unchecked. A
dependency with a published **Advisory** or a licence the MIT app cannot
ship passes every gate. A secret committed by the human or an agent is
noticed only if someone reads the diff. The workflows reference actions by
version tag, so whoever controls a tag decides what runs in CI. Nothing
keeps the 240 development dependencies current, and an **Advisory**
published after a merge is never seen, because nothing runs without a push.

Three gaps in 01's wiring stay open too. The `pull-request` job shares its
workflow with the push job and is only skipped by an `if:` on every push,
and GitHub reports a skipped job as successful under its name, so a push
run can stand in for the **Required check** (design log Q6). A bad
**Commit header** is caught only after the push, by CI. And the **Claude
folder guard** protects the project's `.claude/` but not the **Home
settings**, through which an agent could change its own permissions.

## Solution

The supply-chain gates of row 02 of `docs/feature-checklist.md`, on top of
01's core:

- **Audit** (`npm run check:audit`) runs `npm audit` over every dependency
  and fails on every **Advisory** of any severity without a valid **Audit
  exception**. Exceptions live in a file in `quality/`, each with a reason
  and an **Expiry date**; an expired or stale exception fails too.
- **License allowlist** (`npm run check:licenses`) fails on any package in
  the lockfile whose licence is not on the allowlist in `quality/`.
- Both join **Verify**, after the 01 gates, the **Audit** last.
- **Secret scan**: gitleaks in every CI job; **Push protection** switched on
  by the repository-settings script the human already runs.
- **Pinned actions**: every `uses:` names a full commit SHA with its
  release as a comment, and a gate test fails on any that does not.
- **Daily run**: a scheduled workflow on `main` runs the **Audit** and a
  full-history **Secret scan**, so a new **Advisory** or an expiring
  exception turns red without a commit.
- **Renovate**: dependency updates arrive as **Renovate PRs** whose fixed
  commit messages and titles pass the commit gate, the **Ticket check** and
  the **Pull-request check**, and so the same **Required check** as any
  feature.
- The `pull-request` job moves into its own **pull-request workflow**,
  triggered only by pull requests, so no run ever reports a `pull-request`
  job it did not run.
- A **Commit-msg hook**, installed by `npm ci` / `npm install`, lints the
  message being committed with the commitlint config: feedback at
  `git commit`, while CI still decides.
- The **Claude folder guard** also refuses `Edit` and `Write` of the **Home
  settings**; the human builds this part.

Three steps stay manual for the human after the merge: run the
repository-settings script again (push protection), install the Renovate
GitHub App, and start the **Daily run** once by hand.

## User Stories

**Pull-request workflow**

1. As the human who merges, I want the `pull-request` job in a workflow of
   its own whose only trigger is a pull request into `main`, so that no
   push run can report a skipped `pull-request` job that satisfies the
   **Required check**.
2. As the developer, I want the push workflow to keep only the `verify` job
   and only the `push` trigger for `feat/**` and `refactor/**`, so that each
   workflow does exactly one thing.
3. As the developer, I want the `if:` conditions on both jobs removed, so
   that no condition is left that selects nothing.
4. As the repository owner, I want the **Ruleset** unchanged, still
   requiring the check `pull-request`, so that applying it again is not
   needed for this change.
5. As the repository owner, I want a test that fails when the pull-request
   workflow gains any trigger besides `pull_request`, so that the gap
   cannot reopen.
6. As the repository owner, I want a test that fails when any workflow but
   the pull-request workflow has a job reporting as `pull-request`, so that
   no other job can stand in for the **Required check**.
7. As the developer, I want the gate wiring and **Ruleset** tests to read
   the job from the pull-request workflow, so that they keep checking that
   the **Required check** runs **Verify full** and the **Pull-request
   check**.
8. As the developer, I want the workflows named `CI`, `Pull request` and
   `Daily`, so that the Actions tab tells them apart.

**Pinned actions**

9. As the repository owner, I want every remote `uses:` in every workflow
   pinned to a full 40-character commit SHA, so that a moved tag cannot
   change what runs in CI.
10. As a reviewer, I want each pin to carry its release as a trailing
    comment (`# v7.x.y`), so that I can read which version runs.
11. As the developer, I want a gate test that fails on any `uses:` in any
    workflow file that is not a SHA pin with a `# v…` comment, so that an
    unpinned action cannot slip in, including in a new workflow.
12. As the developer, I want local actions (`./…`) allowed by that test, so
    that a later local action is not rejected for having no SHA.

**Audit**

13. As the repository owner, I want **Verify** to fail on any **Advisory**
    of any severity in the dependency tree, dev dependencies included, so
    that a vulnerable package cannot reach `main`.
14. As the developer, I want an **Advisory** accepted only by an **Audit
    exception** naming its GHSA id, so that one entry covers every package
    the advisory reaches.
15. As the repository owner, I want every exception to carry a reason and
    an **Expiry date**, so that each accepted risk is explained and comes
    back for review.
16. As the repository owner, I want an exception valid through its
    **Expiry date** and the **Audit** failing from the day after, so that no
    exception lasts forever.
17. As the repository owner, I want an exception whose **Advisory** the
    audit no longer reports to fail the **Audit**, so that the exceptions
    file stays a list of live risks for the monthly review.
18. As the developer, I want two exceptions naming the same **Advisory** to
    fail the **Audit**, so that exactly one entry decides.
19. As the developer, I want a malformed exceptions file or entry (missing
    file, invalid JSON, not an array, a missing or empty reason, an id that
    is not a GHSA id, an expiry that is not a real `YYYY-MM-DD` date) to
    fail the **Audit**, naming the entry, so that a typo never accepts an
    advisory.
20. As an AI agent offline, I want the **Audit** to fail with a clear
    message when `npm audit` produces no report, so that a gate that cannot
    run never passes.
21. As the developer, I want each violation on one line naming the
    **Advisory** and why it fails (severity, title and affected packages, or
    the expired date), so that I know what to fix or to ask about.
22. As the developer, I want an **Advisory** without a GHSA id to fail and
    be impossible to except, so that an unknown report shape cannot pass.
23. As the developer, I want the audit's "today" passed to its core as a
    parameter and taken from the UTC date only in the entry, so that every
    test runs on a fixed date.
24. As the developer, I want the exceptions file to land with the one
    **Advisory** open today (`GHSA-g3hv-75wg-m249`, minimatch through the
    lint tooling, expiring `2027-02-02`) and with any further advisory open
    on the day of building, so that the new gate starts green instead of
    blocking every branch.
25. As the developer, I want the **Audit** last in **Verify**, so that the
    offline gates fail before the one that needs the network.

**License allowlist**

26. As the repository owner, I want **Verify** to fail on any installed
    package in the lockfile whose licence is not on the **License
    allowlist**, dev dependencies included, so that the MIT app never
    depends on a licence it cannot ship.
27. As the developer, I want the licences read from the committed lockfile,
    without a licence-checker dependency or an installed `node_modules`, so
    that the check is offline, deterministic and adds nothing to audit.
28. As the developer, I want the allowlist to hold exactly today's licences
    (`MIT`, `ISC`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`,
    `BlueOak-1.0.0`, `Python-2.0`, `MPL-2.0`), so that the gate starts green
    and every new licence is a deliberate gate-file change.
29. As the developer, I want an SPDX `A OR B` to pass when one side is
    allowed, `A AND B` when both are, with parentheses grouping, so that
    dual-licensed packages are judged correctly.
30. As the developer, I want a package without a licence, with a licence
    that is not a string, or with an expression that cannot be read to
    fail, so that an unknown licence is never assumed to be fine.
31. As the developer, I want the workspace root and the **Workspace
    member** entries of the lockfile skipped, so that the repository's own
    code, licensed by the root, is not judged as a dependency.
32. As the developer, I want each violation to name the package and version
    with its licence, so that I see at once which dependency to replace or
    which licence to ask about.
33. As the developer, I want a malformed allowlist to fail the check, so
    that a broken file never allows everything.
34. As the developer, I want `check:licenses` in **Verify** after the 01
    gates and before the **Audit**, so that the order stays cheapest first.

**Secrets**

35. As the repository owner, I want gitleaks to scan the pushed commits in
    the `verify` job, so that a leaked secret on a branch turns the push
    red.
36. As the human who merges, I want gitleaks in the `pull-request` job, so
    that the **Required check** covers the **Secret scan**.
37. As the repository owner, I want the **Daily run** to scan the whole
    history, so that commits from before the gate are scanned too.
38. As the developer, I want gitleaks to run through its official action,
    pinned, with default rules and PR comments off, so that no native
    binary has to be maintained by hand and a red check is the only signal.
39. As the repository owner, I want GitHub secret scanning with **Push
    protection** switched on by the repository-settings script I already
    run, so that a known secret pattern is refused at the push.
40. As the developer, I want a false positive handled by a `.gitleaksignore`
    fingerprint only when it first appears, so that no ignore file exists
    before it is needed.

**Daily run**

41. As the repository owner, I want a workflow that runs every day on
    `main` at 05:00 UTC, so that a new **Advisory** or a passing **Expiry
    date** turns red without anybody pushing.
42. As the repository owner, I want to start the **Daily run** by hand, so
    that I can check it once after the merge.
43. As the repository owner, I want the **Daily run** to run only the
    **Audit** and the full-history **Secret scan**, so that it checks what
    changes without a commit and nothing more.
44. As the developer, I want a test that fails when the **Daily run** loses
    its schedule, its manual trigger, the **Audit** or gitleaks, so that it
    cannot stop checking silently.

**Renovate**

45. As the developer, I want Renovate configured in the repository, so that
    dependency updates arrive as pull requests that pass every gate.
46. As the developer, I want every Renovate commit message to be fixed text
    `chore: [supply-chain] <description>`, so that the commit gate and the
    **Ticket check** accept it.
47. As the human who merges, I want every **Renovate PR** title to be the
    same fixed text as its commit message,
    `chore: [supply-chain] <description>`, so that the **Pull-request
    check**'s rule for `renovate/*` accepts it and rejects the old
    bracket-less form (design log, Implementation Results, D1).
48. As the developer, I want one group each for npm packages, GitHub
    Actions, Node (`.nvmrc` and `engines.node` together), lockfile
    maintenance and vulnerability alerts, so that the PRs stay few and each
    message fits the 50 characters.
49. As the developer, I want Node updated in `.nvmrc` and `engines.node` in
    one PR, so that the gate wiring test that keeps them equal stays green.
50. As the developer, I want Renovate to keep the **Pinned actions** and
    their version comments current, so that pinning does not freeze the
    actions.
51. As the repository owner, I want no dependency dashboard, no automerge,
    a three-day minimum release age and a weekly schedule (before 6am on
    Monday, Europe/Berlin), so that no GitHub issue is opened, I merge every
    PR, a compromised release has time to be pulled, and PRs stay few.
52. As the developer, I want a gate test that fails when any Renovate
    message fails the commitlint config or does not name `supply-chain`,
    when any title fails the **Pull-request check**, when a message holds a
    template, or when a setting of story 51 changes, so that a broken
    config is caught before Renovate opens a red PR.

**Commit-msg hook**

53. As the developer, I want `git commit` to fail at once on a message the
    commitlint config rejects, with one line per violation, so that I fix
    it before pushing.
54. As an AI agent, I want the same feedback on my commits, without a way
    to skip it, so that a bad header never costs a CI run.
55. As the developer, I want the hook to check only the message (header
    grammar, `@`/`#`, 50 characters, one line), never the **Ticket check**,
    the **Branch range** or git history, so that it is fast and needs no
    `origin/main`.
56. As the developer, I want the editor's comment lines and everything from
    git's scissors line on ignored, so that git's own help text never fails
    the `#` rule.
57. As the developer on Windows, I want CRLF line endings, trailing
    whitespace and blank lines cleaned the way git cleans the message, so
    that a message git stores correctly is not rejected.
58. As the developer, I want an empty message passed through to git, so
    that git reports its own "empty commit message" abort.
59. As the developer, I want merge, revert and `fixup!` messages accepted as
    the commit gate accepts them, so that git's generated messages never
    fail the hook.
60. As the developer, I want the hook installed by `npm ci` and
    `npm install` through a `prepare` script, without a hook manager, so
    that every clone and every agent checkout gets it with no extra step.
61. As the developer, I want the hook to run the entry with `node` directly,
    not through `npm run`, so that it adds no start-up time to every commit.
62. As the developer, I want a test that fails when the hook file loses its
    executable mode, its command, or the `prepare` script, so that the hook
    cannot stop running silently.
63. As the developer, I want `docs/conventions.md` to list the hooks
    folder, so that the folder structure stays true.

**Claude folder guard for the Home settings (built by the human)**

64. As the human, I want agents' `Edit` and `Write` of the **Home settings**
    refused, so that no agent can change its own user-level permissions.
65. As an AI agent, I want my auto-memory under the home `.claude/projects/`
    folder still writable, so that the guard blocks only the settings file.
66. As the human, I want the home folder taken from `HOME`, else
    `USERPROFILE`, and the paths compared in POSIX, Windows, Git Bash and
    `~/` form, so that every way of naming the file is caught.
67. As the human, I want the home rule skipped when neither variable is
    set, while the project rule still applies, so that a missing variable
    never blocks every edit.
68. As the human, I want tests pinning that Bash commands naming
    `~/.claude/settings.json` or `$HOME/.claude/settings.json` are blocked,
    so that the existing Bash rule is proven for the home path too.
69. As the human, I want every existing guard case to keep its exit code,
    so that the extension changes nothing else.

**Manual steps**

70. As the repository owner, I want the PRD and the tickets to name the
    three manual steps (run the repository-settings script again, install
    the Renovate app, run the **Daily run** once by hand), so that none is
    forgotten.

## Implementation Decisions

Locations of every file are in the design log's **Files** table; this
section names modules and their interfaces.

**npm scripts**

| Script | Runs |
| --- | --- |
| `check:licenses` | the `checkLicenses` script |
| `check:audit` | the `checkAudit` script |
| `verify` | the nine 01 gates unchanged, then `check:licenses`, then `check:audit` (Q26) |
| `prepare` | `git config core.hooksPath .githooks` (Q41) |

`verify:full` and `check:pr` are unchanged. The gate wiring test's list of
gates and their commands gains the two scripts at their places.

**Gate script modules**

Every new script follows 01's pattern: a pure core (inputs in, `Violation`
list out) that tests drive, and a thin entry that reads files, runs tools,
and ends through `runGate` (`scripts/reportViolations/`).

- `checkAudit` (Q12–Q20, A1–A4):
  - Core `findAuditViolations(report: unknown, exceptions: unknown, today:
    string): Violation[]`, `today` as `YYYY-MM-DD`.
  - Report: `npm audit --json`, report version 2. An **Advisory** is each
    object in a vulnerability's `via` list; its id is the last segment of
    its `url`. String entries in `via` carry no advisory. The packages an
    advisory reaches are every vulnerability whose `via` holds it.
  - Exceptions: a JSON array of `{ advisory, reason, expires }`.
  - Fails on: an advisory with no exception; an expired exception
    (`expires` before `today`); an exception whose advisory the report does
    not list; two exceptions with one advisory; a malformed file or entry;
    a report that is not a version-2 report; an advisory whose `url` holds
    no GHSA id.
  - Entry: runs `npm audit --json` through the npm that runs the script,
    reads the exceptions file from `quality/`, passes today's UTC date.
- `checkLicenses` (Q21–Q24, A5–A7):
  - Core `findLicenseViolations(lockfile: unknown, allowlist: unknown):
    Violation[]`.
  - Checked: every `packages` entry of the lockfile whose key holds a
    `node_modules/` segment and that is not `link: true`; the root and the
    **Workspace member** entries are skipped.
  - SPDX evaluation inside the module: `OR`, `AND`, parentheses; any other
    term, a `WITH` term included, is compared as a whole against the
    allowlist.
  - Entry: reads the lockfile and the allowlist file from `quality/`;
    offline.
- `checkCommitMessage` (Q40–Q44, A9, A11):
  - Core `cleanCommitMessage(raw: string): string`: the text git stores
    with its default cleanup: CRLF to LF, every line from the scissors line
    on dropped, lines starting with `#` dropped, trailing whitespace
    stripped, consecutive blank lines collapsed, leading and trailing blank
    lines removed.
  - Entry: `checkCommitMessage.ts <message-file>`; reads the file, cleans
    it, exits 0 on an empty result, otherwise lints it with
    `lintCommitMessages` and the loaded commitlint config and reports
    through `runGate`.
- `applyBranchProtection` (Q30): the repository `PATCH` that
  `planRulesetRequests` plans gains `security_and_analysis` with
  `secret_scanning` and `secret_scanning_push_protection`, both
  `{ status: 'enabled' }`, beside the merge settings. Name and the
  rest of the module unchanged.

**Violation output**

| Module | Subject | Reason, for example |
| --- | --- | --- |
| `checkAudit` | the GHSA id | `moderate advisory "<title>" in <packages> has no audit exception`; `audit exception expired on <date>`; `audit exception names an advisory npm audit no longer reports` |
| `checkAudit` | `quality/audit-exceptions.json` | the malformed entry's index and field, or the duplicate id |
| `checkAudit` | `npm audit` | the report could not be read |
| `checkLicenses` | `<name>@<version>` | `licence "<value>" is not on the licence allowlist`; `has no licence` |
| `checkLicenses` | `quality/license-allowlist.json` | the allowlist is malformed |

**Gate files under `quality/`**

- The audit exceptions file: `[{ "advisory": "GHSA-g3hv-75wg-m249",
  "reason": "…", "expires": "2027-02-02" }]` plus any advisory open on the
  day of building, each with a reason of the same kind (Q19).
- The licence allowlist: the eight SPDX ids of Q23, as a JSON array.

**CI workflows** (Q5–Q8, Q27–Q32)

- Push workflow (`name: CI`): `push` to `feat/**` and `refactor/**` only;
  job `verify`: checkout with full history, gitleaks, setup-node from
  `.nvmrc` with the npm cache, `npm ci`, `npm run verify`.
- Pull-request workflow (`name: Pull request`): `pull_request` into `main`
  only; job `pull-request`: the same setup with gitleaks after checkout,
  then `npm run verify:full`, then `npm run check:pr` with `PR_TITLE` from
  the event, as in 01.
- **Daily run** (`name: Daily`): `schedule` `0 5 * * *` and
  `workflow_dispatch`; job `daily`: checkout with full history, gitleaks,
  setup-node, `npm ci`, `npm run check:audit`.
- gitleaks: `gitleaks/gitleaks-action`, env `GITHUB_TOKEN` from the
  workflow's secret and `GITLEAKS_ENABLE_COMMENTS: false`; no config file.
- No `if:` on any job. Every `uses:` a **Pinned action** with its
  `# v…` comment.

**Gate tests**

- Pinned actions (Q11): reads every file under `.github/workflows/` as
  text; every `uses:` is `<owner>/<repo>[/<path>]@<40 hex> # v…`, or local.
- Gate wiring (01 A4, extended by A8): the two new scripts in **Verify** at
  their places; the push workflow has only the `push` trigger with the two
  branch patterns and runs `npm run verify`; the pull-request workflow has
  only the `pull_request` trigger into `main`; each of the three jobs runs
  gitleaks after checkout with comments off; the daily job has the
  schedule and the manual trigger, checks out full history and runs
  `npm run check:audit`.
- **Ruleset** (Q7): the `pull-request` job is read from the pull-request
  workflow; across every workflow file exactly one job reports as
  `pull-request`.
- Renovate (Q34–Q38, A12, A13): reads the Renovate config; every commit
  message passes the loaded commitlint config, names `supply-chain` and
  holds no `{{`; every PR title passes `checkPullRequest` on a `renovate/*`
  branch; the Node rule covers both `.nvmrc` and `engines.node`; the
  presets, `semanticCommits`, no `commitBody`, no automerge, the release
  age, the schedule, the timezone and the default `renovate/` branch prefix.
- Commit-msg hook (A10): the hook file is tracked with mode `100755`,
  starts with `#!/bin/sh` and runs the entry with `"$1"`; `prepare` is the
  hooks-path command; driving the hook with `sh` from the repository root
  on a temporary message file exits 0 for a valid header and 1, with the
  violation line, for an invalid one.

**Renovate config** (Q33–Q37)

- `extends`: `config:recommended`, `helpers:pinGitHubActionDigests`,
  `:disableDependencyDashboard`. `semanticCommits: "disabled"`, no
  `commitBody`, no automerge, `minimumReleaseAge: "3 days"`, schedule
  `before 6am on monday`, timezone `Europe/Berlin`.
- One rule per group (Q36), each with its fixed `commitMessage` and
  `prTitle`; lockfile maintenance enabled with its fixed pair; vulnerability
  alerts with their fixed pair and no `[SECURITY]` suffix.
- No `renovate` package and no config validator (A12).

**Commit-msg hook** (Q39–Q44)

- A committed hooks folder with one file, `commit-msg`: `#!/bin/sh`,
  executable, running `node scripts/checkCommitMessage/checkCommitMessage.ts
  "$1"` from the repository root, where git runs hooks.
- `docs/conventions.md`, Folder structure: one line for the hooks folder.
- `--no-verify` stays blocked for agents by the existing dangerous-git
  hook; CI catches what the hook misses.

**Claude folder guard** (Q45–Q48, built by the human)

- `.claude/hooks/block-claude-edits.sh`: the node judge also receives the
  home folder (`HOME`, else `USERPROFILE`) on standard input, normalises it
  like the project root, resolves `~/` and `~\` against it, and blocks
  `Edit`/`Write` whose path equals `<home>/.claude/settings.json`. The Bash
  rule is unchanged.
- The tests in the guard's gate test gain Q48's cases with invented home
  folders. The issue-loop stops at this ticket; the human builds it.

**Out of the agents' hands**

- After the merge, the human runs `applyBranchProtection` again (push
  protection), installs the Renovate GitHub App on the repository (no
  onboarding PR, because the config is on `main`), and starts the **Daily
  run** once with `workflow_dispatch`. The last ticket ends with these as
  its handover note, not as acceptance criteria.

## Testing Decisions

- A good test drives a gate through its public interface and asserts what
  it reports: the violations of a pure core, the exit code and output of a
  hook or entry, the parsed content of a config. It never asserts on
  internals such as regexes or parser steps.
- All tests are Vitest tests. No React code, so no stories; no app user
  flow, so no Playwright test (Q3). The feature's main flows (push, open a
  pull request, the daily schedule, a Renovate PR, `git commit`) are
  checked by the CI runs and by the human's manual steps.
- Modules and their tests:
  - `findAuditViolations`: table-driven, invented version-2 reports and
    exception lists with invented GHSA ids and package names: no
    advisories; an advisory with and without an exception; an exception on
    its expiry date and the day after; a stale exception; duplicates; each
    malformed field; a report without `vulnerabilities`; an advisory
    without a GHSA id; one advisory reaching several packages, reported
    once.
  - `findLicenseViolations`: invented lockfiles: allowed, disallowed and
    missing licences; `OR`, `AND`, parentheses, `WITH`; an unreadable
    expression; root, workspace member and link entries skipped; nested
    `node_modules` entries checked; a malformed allowlist.
  - `cleanCommitMessage`: comment lines, the scissors line, CRLF, trailing
    whitespace, blank lines, an all-comment message.
  - `planRulesetRequests`: the repository patch carries the secret-scanning
    settings beside the merge settings.
  - The gate tests above: pinned actions, gate wiring, **Ruleset**,
    Renovate, commit-msg hook.
  - The **Claude folder guard** cases of Q48 (the human's ticket).
- The `checkAudit` entry is not run in tests: it needs the network, and
  tests never touch it (`CLAUDE.md`, Tests). Its core carries every rule.
- Deterministic: fixed dates (`2026-10-26`-style ISO strings) passed as
  `today`, invented data only, a fresh temporary folder per test that
  writes files.
- Prior art: the pure cores and table tests of `checkDataFiles`,
  `checkDocsDrift` and `checkPullRequest`; the commitlint tests in
  `gates/commitMessages/`; the YAML-reading tests in `gates/gateWiring/`
  and `gates/ruleset/`; `applyBranchProtection`'s request-planning tests;
  the hook-driving tests in `gates/claudeFolderGuard/`.

## Out of Scope

- Flaky quarantine and its daily expiry check (03); SBOM and release
  signing (20).
- `npm audit signatures`, workflow `permissions:` blocks and GitHub's
  repository-level SHA-pinning policy.
- A maximum length for an **Expiry date** (Q18); per-package licence
  exceptions (Q24).
- A Renovate config validator or the `renovate` package (A12).
- The **Ticket check** or **Branch range** in the **Commit-msg hook** (Q40);
  a hook manager.
- Blocking `~/.claude.json` or any home file other than the **Home
  settings**.
- Changes to `CLAUDE.md`'s "Ask first" list; the Renovate config, the hooks
  folder and the `prepare` script are not added to it (Q49).

## Further Notes

- The tickets name gate files (the workflows, `quality/`, the `verify`
  script, the tests under `gates/`), so `/feature-pipeline` pauses after
  planning for the human's `go` (Q49), and the guard ticket is built by
  the human (Q47).
- Each new gate checks the whole repository from the day it lands, so the
  **Audit** must start with the exceptions of the day of building, and the
  **Secret scan** of the first push sees the whole branch.
- Pinning needs each action's release SHA, looked up on GitHub when the
  ticket is built; Renovate keeps them current afterwards.
- **Verify** now needs the network for the **Audit**; offline, it fails at
  the last gate with the audit's message, after every offline gate has run.
- GitHub disables scheduled workflows after 60 days without repository
  activity; if that happens, the human re-enables the **Daily run** in the
  Actions tab.
- Assumptions taken while writing this PRD are in the design log under
  "Assumptions from write-a-prd" (A1–A13).
