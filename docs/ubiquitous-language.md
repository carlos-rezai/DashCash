# Ubiquitous Language

## Delivery: features, tickets, commits

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Feature** (new) | One row of `docs/feature-checklist.md`, built on one branch and merged in one pull request. | Epic, story, item |
| **Feature folder** (new) | The folder `docs/features/<NN>-<feature>/` holding a feature's design log, PRD, plan, tickets and refactor plan. | Feature dir, spec folder |
| **Feature status** (new) | A feature's place in the checklist: `planned`, `in-progress`, `done` or `refactored`. | Phase, state |
| **Ticket** (new) | One numbered file `<nn>-<name>.md` in a feature folder, describing one vertical slice. | Issue, task, card |
| **Ticket number** (new) | The two-digit number `<nn>` that names a ticket and gives its build order. | Ticket id, issue number |
| **Ticket status** (new) | A ticket's front-matter field: `open`, `in-progress` or `done`. | State |
| **Refactor step** (new) | One numbered checklist line `- [ ] <nn> <description>` in a feature's `refactor-plan.md`. | Refactor ticket, refactor task |
| **Ticket commit** (new) | A commit that carries a ticket number; every `feat`, `fix` and `test` commit is one. | Work commit |
| **Planning commit** (new) | A `docs:` commit of the planning chain that carries no ticket number, such as `docs: [<feature>] add prd`. | Doc commit |
| **Commit header** (new) | The one-line commit message `<type>: [<feature>] <nn> <description>`. | Commit title, subject line |
| **Assumption** (new) | A planning answer no source settles, recorded as `**Assumption:**` in the design log for the human to confirm or overturn. | Guess, default, TBD |

## Gates and checks

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Gate** (new) | A check that must pass before a change can reach `main`. | Guard, hook, policy |
| **Verify** (new) | `npm run verify`: the one entry point that runs every gate except end-to-end tests, the same locally, for agents and in CI. | Check-all, CI script, precommit |
| **Verify full** (new) | `npm run verify:full`: verify plus build and end-to-end tests, run on every pull request into `main`. | Full CI, e2e run |
| **Branch range** (new) | The commits of the current branch not yet on `main`: `origin/main..HEAD`. | Diff, PR commits |
| **Ticket check** (new) | The gate that every commit in the branch range names an existing feature folder, ticket or refactor step. | Issue check, reference check |
| **Pull-request check** (new) | The gate, run only on pull requests into `main`, that every ticket is `done` or every refactor step is ticked, and that the PR title follows the commit header. | Merge check, done check |
| **Data file** (new) | A tracked `*.db`, `*.sqlite` or `*.csv` file outside `fixtures/`, or any `.env` file but `.env.example`, which the data-file check rejects. | Dump, export, real data |
| **Fixture** (new) | Invented test data in `fixtures/`; the only place a CSV may be committed. | Sample data, test dump, real export |
| **Docs drift** (new) | A path named in `README.md`, `CLAUDE.md` or `docs/*.md` that no longer exists in the repository. | Dead link, stale doc |
| **Ruleset** (new) | The GitHub rules on `main`, kept as code in `.github/rulesets/main.json`: pull request required, the `pull-request` check green and up to date, merge commits only. | Branch protection settings |
| **Required check** (updated) | The CI job the ruleset waits for before a merge: `pull-request`, the one job of the pull-request workflow, which runs on pull requests only. | Status, build badge |

## Supply chain

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Advisory** (new) | A published vulnerability report for an npm package, identified by its GHSA id. | CVE, vuln, alert |
| **Audit** (new) | The gate that fails on every advisory of any severity in the dependency tree that has no valid audit exception. | Security scan, npm check |
| **Audit exception** (new) | An entry in the audit exceptions file in `quality/` that accepts one advisory, with a reason and an expiry date. | Ignore, waiver, suppression |
| **Expiry date** (new) | The last day an audit exception is valid; from the day after, the audit fails. | Deadline, TTL |
| **License allowlist** (new) | The SPDX licence ids in `quality/` that every package in the lockfile must carry. | Whitelist, licence policy |
| **Secret scan** (new) | gitleaks in CI over the pushed commits, the pull request's commits or, in the daily run, the whole history. | Leak check, credential scan |
| **Push protection** (new) | GitHub's repository setting that refuses a push containing a known secret pattern. | Secret blocking |
| **Pinned action** (new) | A workflow `uses:` that names a full commit SHA, with its release as a trailing comment. | Locked action, tagged action |
| **Daily run** (new) | The scheduled workflow on `main` that runs the audit and a full-history secret scan. | Nightly, cron job |
| **Renovate PR** (new) | A pull request from a `renovate/*` branch that updates dependencies, its commits naming the feature `supply-chain`. | Bot PR, dependency PR |

## Local feedback and agent guards

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Commit-msg hook** (new) | The local git hook that lints the message being committed with the commitlint config; feedback before the push, not a gate. | Pre-commit hook, local gate |
| **Claude folder guard** (new) | The Claude Code hook that refuses an agent's change under the project's `.claude/` or to the home settings. | Edit blocker, sandbox |
| **Home settings** (new) | The user-level Claude Code settings file `~/.claude/settings.json`. | Global config, user config |

## Code structure

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Workspace** (new) | The npm workspace root that holds the members under `apps/*` and `packages/*`. | Monorepo root, project |
| **Workspace member** (new) | One package of the workspace, named `@dashcash/<folder>`: `domain`, `contract` or `desktop`. | Module, subproject |
| **Layer** (new) | One level of the renderer: tokens, primitives, components, features, layouts, pages, App; a layer imports only from layers below it. | Tier, level |
| **Layer rule** (new) | A dependency-cruiser rule that forbids an import across the architecture: upwards between layers, into another feature, out of domain, or into `test-support/` from shipping code. | Guard test, import rule |
| **Shipping code** (new) | Every source file that is not a test, a story, `test-support/` or `e2e/`. | Production code, src |

## Relationships

- A **Feature** has exactly one **Feature folder**, one branch and one feature pull request.
- A **Feature folder** holds one or more **Tickets** and, after the merge, zero or one refactor plan with one or more **Refactor steps**.
- A **Ticket commit** names exactly one **Ticket**; a `refactor:` commit names exactly one **Refactor step**; a **Planning commit** names only its **Feature**.
- **Verify** runs every **Gate** except end-to-end tests; **Verify full** runs **Verify** plus build and end-to-end tests.
- The **Ruleset** names exactly one **Required check**, and that check runs **Verify full** and the **Pull-request check**.
- A **Layer rule** constrains **Shipping code**; tests and stories may import `test-support/`.
- An **Advisory** fails the **Audit** unless exactly one **Audit exception** names it and its **Expiry date** has not passed; an **Audit exception** whose **Advisory** is no longer reported fails it too.
- The **Daily run** runs the **Audit** and a **Secret scan**; the **Required check** runs **Verify full**, which includes the **Audit**, and a **Secret scan**.
- A **Renovate PR** passes the same **Required check** as a feature pull request; its workflows use only **Pinned actions**.
- The **Commit-msg hook** checks one message; the commit gate and the **Ticket check** check the whole **Branch range** in CI.

## Example dialogue

> **Dev:** "The builder committed `feat: [csv-import] 07 add duplicate detection`, but the folder has only six **Tickets**. Will **Verify** catch it?"
> **Domain expert:** "Yes. The **Ticket check** walks the **Branch range** and fails because **Ticket number** 07 names no ticket file in the **Feature folder**."
> **Dev:** "And when all seven exist but one is still `in-progress`?"
> **Domain expert:** "**Verify** passes, because mid-feature that is normal. The **Pull-request check** fails on the pull request into `main`, and the **Ruleset** blocks the merge until the **Required check** is green."
> **Dev:** "What about `docs: [csv-import] add plan`? It has no number."
> **Domain expert:** "That is a **Planning commit**: it needs only the **Feature folder** to exist. Only **Ticket commits** and `refactor:` commits must carry a number."
> **Dev:** "Overnight a new **Advisory** came out for a lint plugin. Why is my branch red although I changed nothing?"
> **Domain expert:** "The **Daily run** and **Verify** both run the **Audit**. Either a **Renovate PR** brings the fix, or you ask for an **Audit exception** with a reason and an **Expiry date**; the day after that date the **Audit** fails again."
> **Dev:** "And if I mistype a **Commit header**? Does the **Commit-msg hook** stop the push?"
> **Domain expert:** "It stops the commit, before any push. It is feedback, not a **Gate**: the commit gate in CI still decides, over the whole **Branch range**."

## Flagged ambiguities

- "feature" means both a checklist **Feature** and the renderer's `features/` **Layer**. Use **Feature** for the checklist row; say "feature module" or the folder path `features/<name>/` for the layer.
- "step" means both a **Refactor step** and a step of the import wizard (10). Always qualify it: **Refactor step** or "wizard step".
- "layer" means both a renderer **Layer** and a test layer (domain, story, end-to-end) in `docs/conventions.md`. Use **Layer** for the renderer; say "test layer" for the other.
- "status" means both **Ticket status** (`open`, `in-progress`, `done`) and **Feature status** (`planned`, `in-progress`, `done`, `refactored`). Name which one.
- "issue" appears in skill names (`prd-to-issues`, `issue-loop`) but the files are **Tickets**; GitHub issues are not used. Say **Ticket**.
- "check" is used for a **Gate**, a CI job and a GitHub status. A **Gate** is the rule; the **Required check** is the CI job the **Ruleset** waits for.
- "hook" (new) means a git hook (the **Commit-msg hook**) and a Claude Code hook (the **Claude folder guard**, the dangerous-git hook). Name which one; neither is a **Gate**, because CI decides.
- "exception" (new) means an **Audit exception** and a thrown error. Say **Audit exception** for the file entry.
- "allowlist" (new) is only the **License allowlist**; accepted advisories are **Audit exceptions**, not an allowlist.
- "workflow" (new) means a GitHub Actions file and the planning-and-build workflow of `docs/conventions.md`. Say "CI workflow" for the file, or name it: the push workflow, the pull-request workflow, the **Daily run**.
