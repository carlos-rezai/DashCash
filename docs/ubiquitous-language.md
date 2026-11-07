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
| **Verify full** (updated) | `npm run verify:full`: **Verify**, then the **App build**, then every **End-to-end test**, run on every pull request into `main`. | Full CI, e2e run |
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
| **Audit exception** (new) | An entry in the audit exceptions file in `quality/` that accepts one advisory, with a reason, the date it was added and an expiry date at most 90 days later. | Ignore, waiver, suppression |
| **Expiry date** (updated) | The last day an **Audit exception** or a **Quarantine entry** is valid; from the day after, the **Audit** or the **Quarantine check** fails. | Deadline, TTL |
| **License allowlist** (new) | The SPDX licence ids in `quality/` that every package in the lockfile must carry. | Whitelist, licence policy |
| **Secret scan** (new) | gitleaks in CI over the pushed commits, the pull request's commits or, in the daily run, the whole history. | Leak check, credential scan |
| **Push protection** (new) | GitHub's repository setting that refuses a push containing a known secret pattern. | Secret blocking |
| **Pinned action** (new) | A workflow `uses:` that names a full commit SHA, with its release as a trailing comment. | Locked action, tagged action |
| **Daily run** (updated) | The scheduled workflow on `main` whose jobs run the audit, the **Quarantine check**, a full-history secret scan and the **Mutation run**. | Nightly, cron job |
| **Renovate PR** (new) | A pull request from a `renovate/*` branch that updates dependencies, its commits naming the feature `supply-chain`. | Bot PR, dependency PR |

## Mutation testing

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Mutation testing** (new) | The gate that changes **Shipping code** in `packages/domain`, `scripts/` and `gates/` one small edit at a time with StrykerJS and checks that the tests notice. | Test-quality check, fuzzing |
| **Mutant** (new) | One such edit of the code, such as a flipped condition or a removed statement. | Mutation, variant |
| **Killed mutant** (new) | A **Mutant** that makes at least one test fail or time out. | Detected, caught |
| **Surviving mutant** (new) | A **Mutant** that every test covering it still passes, or that no test covers: a gap in the tests. | Survivor, escaped mutant |
| **Mutation score** (new) | The share of **Mutants** killed, in percent of all **Mutants**. | Coverage, kill rate |
| **Mutation run** (new) | One run of `npm run test:mutation`: by hand, in the `pull-request` job of the **Required check**, or nightly as the `mutation` job of the **Daily run**. | Stryker job, mutation build |
| **Mutation report** (new) | The HTML report of a **Mutation run**, listing every **Surviving mutant**; the nightly run keeps it as a CI artifact. | Stryker output, dashboard |
| **Break threshold** (new) | The lowest **Mutation score** a **Mutation run** passes with; it is only ever raised, and lowering it needs a written decision. | Minimum score, ratchet value |
| **Informative gate** (new) | A gate that reports its result without failing, as **Mutation testing** does before its **Break threshold** is set. | Soft gate, warning mode |
| **Fail closed** (new) | What a gate does with input it cannot judge, such as a malformed lockfile or exceptions file: it fails instead of passing. | Strict mode, defensive check |

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
| **Layer rule** (updated) | A dependency-cruiser rule that forbids an import across the architecture: upwards between layers, into another feature, out of domain, into `test-support/` from shipping code, or of SQLite from outside `main/db/`. | Guard test, import rule |
| **Shipping code** (new) | Every source file that is not a test, a story, `test-support/` or `e2e/`. | Production code, src |

## Desktop app

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Main process** (new) | Electron's Node process of the desktop member: it owns the window, the **Data folder**, the **Database** and the IPC handlers. | Backend, server |
| **Preload** (new) | The script that runs before the page in an isolated context and exposes the **Bridge**, nothing else. | Preload API, context script |
| **Renderer** (new) | The sandboxed page in the app's window, served by the **App protocol**; it reaches the **Main process** only through the **Bridge**. | Frontend, web view, UI process |
| **Contract** (new) | The **Workspace member** `@dashcash/contract`: every **Channel** with its request and response types, and the type of the **Bridge**. | API, IPC schema |
| **Channel** (new) | One named request and response of the **Contract**, written `<area>:<action>`, such as `app:info`. | Endpoint, route, IPC event |
| **Bridge** (new) | The object `window.dashcash` the **Preload** exposes; its `invoke` sends a request on a **Channel** the **Contract** lists and refuses any other. | ipcRenderer, preload API |
| **Sender check** (new) | The **Main process** refusing an IPC request whose frame is not on the app's origin, before any handler runs. | Origin check, auth |
| **App protocol** (new) | The custom scheme `app://dashcash` that serves the built **Renderer** files and nothing outside their folder. | File URL, local server |
| **CSP** (new) | The Content Security Policy meta tag in the **Renderer**'s HTML, listing every source the page may load; anything unlisted is blocked. | Security header |
| **Secure defaults** (new) | The Electron security settings every window and session gets: sandbox and context isolation on, Node integration off, navigation, new windows, webviews and permissions refused. | Hardening flags |
| **Data folder** (new) | The folder holding the **Database** and the imported CSVs: Electron's `userData` (`%APPDATA%\DashCash` on Windows), or the folder in `DASHCASH_DATA_FOLDER` when set. | App data, profile, database folder |
| **Database** (new) | The SQLite file `dashcash.db` in the **Data folder**, opened once by the **Main process** through `main/db/`. | DB file, store |
| **Migration** (new) | One numbered schema change in the ordered list in `main/db/`; once merged it is never edited, only followed by another. | Schema update, upgrade script |
| **Schema version** (new) | The number of the last **Migration** applied to a **Database**, kept in SQLite's `user_version`. | DB version |
| **App version** (new) | The version of the desktop **Workspace member**, which the `app:info` **Channel** returns. | Build number, release |
| **App build** (new) | `npm run build`: the bundled main, preload and renderer in the desktop member's `out/` folder, which the **End-to-end tests** drive; not the installer. | Bundle, release build |
| **Single-instance lock** (new) | Electron's lock per **Data folder** that makes a second start focus the running window and quit. | Mutex, instance guard |
| **Debug port** (new) | Chromium's remote debugging port 9222 on loopback, open only when the app runs from `npm run dev`. | Inspector, DevTools port |
| **Startup error** (new) | The native error box "DashCash couldn't start" shown, before quitting, when the **Data folder** or the **Database** cannot be opened or migrated. | Crash dialog |

## End-to-end tests and quarantine

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **User flow** (new) | A goal the user reaches across pages, IPC and the **Database**, such as starting the app or importing a CSV. | Scenario, journey, use case |
| **End-to-end test** (new) | A Playwright test in `e2e/` that drives the **App build** through one **User flow**. | e2e, UI test, integration test |
| **App fixture** (new) | The Playwright fixture that gives each **End-to-end test** a fresh temporary **Data folder** and the launched app, and removes both afterwards. | Launcher, test harness |
| **Flaky test** (new) | A test that passes and fails on the same code. | Intermittent, unstable test |
| **Quarantine** (new) | The flaky-quarantine file in `quality/`: the **Flaky tests** left out of the end-to-end run until fixed or deleted. | Skip list, ignore list |
| **Quarantine entry** (new) | One test in the **Quarantine**, with its file, title, ticket, owner, the date it was added and an **Expiry date** at most 30 days later. | Exception, waiver |
| **Quarantine check** (new) | The gate, in **Verify** and the **Daily run**, that fails on a malformed **Quarantine**, a missing test or ticket file, or a **Quarantine entry** past its **Expiry date**. | Flaky check, expiry job |

## Relationships

- A **Feature** has exactly one **Feature folder**, one branch and one feature pull request.
- A **Feature folder** holds one or more **Tickets** and, after the merge, zero or one refactor plan with one or more **Refactor steps**.
- A **Ticket commit** names exactly one **Ticket**; a `refactor:` commit names exactly one **Refactor step**; a **Planning commit** names only its **Feature**.
- **Verify** runs every **Gate** except end-to-end tests; **Verify full** runs **Verify** plus build and end-to-end tests.
- The **Ruleset** names exactly one **Required check**, and that check runs **Verify full**, the **Pull-request check** and the **Mutation run**.
- A **Layer rule** constrains **Shipping code**; tests and stories may import `test-support/`.
- An **Advisory** fails the **Audit** unless exactly one **Audit exception** names it and its **Expiry date** has not passed; an **Audit exception** whose **Advisory** is no longer reported fails it too.
- The **Daily run** runs the **Audit**, a **Secret scan** and the **Mutation run**; the **Required check** runs **Verify full**, which includes the **Audit**, plus a **Secret scan** and the **Mutation run**.
- A **Renovate PR** passes the same **Required check** as a feature pull request; its workflows use only **Pinned actions**.
- The **Commit-msg hook** checks one message; the commit gate and the **Ticket check** check the whole **Branch range** in CI.
- (new) A **Mutation run** produces many **Mutants**, each either a **Killed mutant** or a **Surviving mutant**, one **Mutation score** and one **Mutation report**.
- (new) **Mutation testing** is an **Informative gate** until its **Break threshold** is set; from then on a **Mutation score** below it fails the **Mutation run**, turns the **Daily run** red and fails the **Required check**. It is not part of **Verify**; it runs in the **Required check** and in the **Daily run**.
- (new) Every gate must **Fail closed**: the licence check on a lockfile that is not an object with a `packages` object, the **Audit** on an unreadable report.
- (new) The **Renderer** reaches the **Main process** only through the **Bridge**; the **Bridge** sends only **Channels** of the **Contract**, and every request passes the **Sender check** before its handler runs.
- (new) A **Data folder** holds exactly one **Database** and has at most one running app, held by its **Single-instance lock**.
- (new) A **Database**'s **Schema version** is the number of **Migrations** applied; a **Schema version** above the newest **Migration**, or a failing **Migration**, ends in the **Startup error**.
- (new) **Verify full** builds the **App build** once and runs every **End-to-end test** against it, each in its own **Data folder** from the **App fixture**.
- (new) A **Quarantine entry** names exactly one **End-to-end test** and one **Ticket**; the **Quarantine check** fails **Verify** and the **Daily run** from the day after its **Expiry date**.

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
> **Dev:** "My pull request is red, but **Verify full** passed. What broke?"
> **Domain expert:** "The **Mutation run** in the **Required check**. Your new gate script's tests leave **Surviving mutants**, so the **Mutation score** fell below the **Break threshold** and the merge is blocked. The log lists the survivors; add the missing tests. The **Daily run** turns red the same way, and there the **Mutation report** artifact shows them."
> **Dev:** "Can I lower the **Break threshold** instead?"
> **Domain expert:** "Only with a written decision, and only the human changes that gate file. Before the threshold was set, **Mutation testing** was an **Informative gate**: the same score would only have shown in the report."
> **Dev:** "The accounts page needs the list of accounts. Do I read the **Database** from the **Renderer**?"
> **Domain expert:** "Never. You add a **Channel** such as `accounts:list` to the **Contract**, a handler in the **Main process**, and a **Migration** for the table. The **Renderer** calls it through the **Bridge**, and the **Sender check** runs before your handler."
> **Dev:** "My **End-to-end test** for creating an account failed once in CI and passed on the rerun. Can I add a retry?"
> **Domain expert:** "No. A **Flaky test** is broken. Put it in the **Quarantine** with a **Ticket**, an owner and an **Expiry date** at most 30 days out; it leaves the run, and the day after that date the **Quarantine check** turns **Verify** and the **Daily run** red until the test is fixed or deleted."
> **Dev:** "Could the failure come from another test's data?"
> **Domain expert:** "Not if it uses the **App fixture**: each test gets its own **Data folder**, so its own **Database** and its own **Single-instance lock**."

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
- "threshold" (new) means the **Break threshold** and Stryker's `high` and `low` thresholds, which only colour the **Mutation report**; later also the coverage threshold (05). Say **Break threshold** for the one that fails a run.
- "coverage" (new) means test coverage of lines and Stryker's per-test coverage of **Mutants**. A **Mutation score** is not coverage; a **Mutant** no test reaches is a **Surviving mutant**.
- "nightly" and "daily" (new) name the same schedule: the **Mutation run** is a job of the **Daily run**, not a workflow of its own.
- "mutation" (new) is the technique; one edit is a **Mutant**. Avoid "a mutation" for a single edit.
- "workflow" (new) means a GitHub Actions file and the planning-and-build workflow of `docs/conventions.md`. Say "CI workflow" for the file, or name it: the push workflow, the pull-request workflow, the **Daily run**.
- "app" (new) means the product, Electron's `app` object, the renderer's `App/` **Layer**, the `app:` area of **Channels** and the **App protocol**. Say "the app" for the product only, and name the others.
- "data folder" (new): the settings page labels it "Database folder" (verbatim copy, 22), and Electron calls its default location `userData`. In code and docs it is the **Data folder**; `userData` is only its default.
- "contract", "bridge" and "API" (new) are three things: the **Contract** is the types package, the **Bridge** is the runtime object in the page, and the renderer's `api/` folder holds the calls a feature makes through the **Bridge**. Avoid "API" alone.
- "version" (new) means the **App version**, the **Schema version** and a dependency's version. Name which.
- "build" (new) means the **App build**, the issue-loop's build step and the installer (20). Say **App build** for `npm run build`, "installer" for 20.
- "quarantine" and "exception" (new): a **Quarantine entry** takes a **Flaky test** out of the run; an **Audit exception** accepts an **Advisory**. Both expire, in different files, with different limits (30 and 90 days).
- "harness" (new): the checklist's "Playwright harness" is the Playwright config, the **App fixture** and `npm run test:e2e` together; the **App fixture** is only the per-test part.
- "flow" (new): a **User flow** is what one **End-to-end test** covers; a behaviour inside one component or module is never one, and gets a story or a Vitest test.
- "debug port" (new) is only the **Debug port** of `npm run dev`; the port Playwright opens to drive the **App build** is Playwright's own and not part of the app.
