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
| **Commit-message parts** (new) | Renovate's prefix, action, topic, extra and suffix, from which it assembles every commit message and **Renovate PR** title; `renovate.json` sets only these, never the whole message or title. | Commit template, PR title setting |
| **Hold rule** (new) | A Renovate rule that keeps a dependency back: Node and TypeScript majors disabled, `@types/node` capped at the major in `.nvmrc`; a human lifts it in a ticket. | Pin, freeze, ignore rule |

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
| **Gate wiring** (new) | The npm scripts and CI workflow jobs that run the gates, each part pinned by the gate test of its own folder under `gates/`. | CI setup, pipeline config |
| **Problem finder** (new) | A function in a gate module that names, one line each, what a configuration lacks or holds beyond its **Gate wiring**; **Shipping code**, so **Mutation testing** mutates it. | Helper, matcher, validator |
| **Fail closed** (new) | What a gate does with input it cannot judge, such as a malformed lockfile or exceptions file: it fails instead of passing. | Strict mode, defensive check |

## Local feedback and agent guards

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Commit-msg hook** (new) | The local git hook that lints the message being committed with the commitlint config; feedback before the push, not a gate. | Pre-commit hook, local gate |
| **Dangerous-git hook** (new) | The Claude Code hook that refuses an agent's destructive git commands, and a `git push` that is chained with another command, that pushes to `main`, or that runs on a branch other than `feat/*` or `refactor/*`. | Git guard, push blocker |
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

## Design system

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Theme** (new) | The one object holding every **Token** value the renderer's styles read, typed as styled-components' `DefaultTheme`. | Stylesheet, CSS variables, palette |
| **Token** (new) | One named value of the **Theme**: a colour, font, size, spacing, shadow or duration. | Variable, magic number |
| **Primitive** (new) | A React component of the primitives **Layer** built from **Tokens** only, such as Button, Amount or Loader. | Atom, base component |
| **Component** (new) | A React component of the components **Layer** built from **Primitives**, such as Card, Modal or YearTable. | Widget, molecule |
| **Feature component** (new) | A React component inside a feature module under `features/<name>/` that reads data, such as BalanceChart. | Container, smart component |
| **Tone** (new) | The named colour role a **Primitive** or **Component** takes, such as Amount's `auto`, Tag's `milestone` or Snackbar's `warning`, mapped to **Tokens**. | Colour, status, kind |
| **Control height** (new) | One of the two heights every interactive control has: md 36 px (forms, modals, page headers) or sm 28 px (toolbars, tables, card headers, snackbars). | Size, density |
| **Story** (new) | One named state of a **Primitive**, **Component** or **Feature component** in its stories file beside it. | Example, demo, fixture |
| **Play function** (new) | The interaction script of a **Story**: it clicks, types and asserts what the user sees. | Interaction test, script |
| **Story test** (new) | A **Story** run as a Vitest test in headless Chromium: it renders, runs its **Play function** and the **Accessibility check**. | Component test, snapshot test |
| **Accessibility check** (new) | axe run in every **Story test** through Storybook's a11y addon; a violation fails the test, while a colour-contrast failure is only reported for review. | a11y lint, audit |
| **Story check** (new) | The gate that every **Primitive**, **Component** and **Feature component** has its stories file. | Story lint |
| **Storybook MCP** (new) | The MCP endpoint the running Storybook dev server serves, through which agents list and inspect **Stories**. | Storybook server, MCP plugin |

## Money

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Cents** (new) | Money as a whole number of euro cents: the branded type every money value carries. | Amount, euros, float, value |
| **Money format** (new) | How **Cents** read on screen: German grouping and decimals, a no-break space before `€`, U+2212 for minus, such as `−86,40 €`. | Currency string, locale format |
| **Polarity** (new) | The colour of money by its sign: green above 0, red below 0, ink at 0. | Sign colour, red/green |
| **Milestone tone** (new) | The colour role of the mortgage payoff: the positive green, never the warning amber. | Payoff highlight, success colour |

## Coverage

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **Changed lines** (new) | The lines of **Shipping code** added or changed between the merge base with `origin/main` and the working tree, plus every line of an untracked file. | Diff, patch, branch range |
| **Changed-lines coverage** (new) | The share of coverable **Changed lines** that the unit tests or the **Story tests** run. | Patch coverage, diff coverage |
| **Coverage threshold** (new) | The lowest **Changed-lines coverage** that **Verify** passes with, kept in a file in `quality/`; it is only ever raised. | Minimum coverage, coverage target |

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
| **App protocol** (updated) | The custom scheme `app://dashcash` that serves the built **Renderer** files to the host `dashcash` only, and nothing outside their folder. | File URL, local server |
| **App origins** (new) | The origins the app trusts as its own: `app://dashcash` always, plus the dev server's origin in `npm run dev`. | Allowed hosts, whitelist |
| **CSP** (new) | The Content Security Policy meta tag in the **Renderer**'s HTML, listing every source the page may load; anything unlisted is blocked. | Security header |
| **Secure defaults** (new) | The Electron security settings every window and session gets: sandbox and context isolation on, Node integration off, navigation, new windows, webviews and permissions refused. | Hardening flags |
| **Data folder** (new) | The folder holding the **Database** and the imported CSVs: Electron's `userData` (`%APPDATA%\DashCash` on Windows), or the folder in `DASHCASH_DATA_FOLDER` when set. | App data, profile, database folder |
| **Database** (new) | The SQLite file `dashcash.db` in the **Data folder**, opened once by the **Main process** through `main/db/`. | DB file, store |
| **Migration** (new) | One numbered schema change in the ordered list in `main/db/`; once merged it is never edited, only followed by another. | Schema update, upgrade script |
| **Schema version** (new) | The number of the last **Migration** applied to a **Database**, kept in SQLite's `user_version`. | DB version |
| **App version** (new) | The version of the desktop **Workspace member**, which the `app:info` **Channel** returns. | Build number, release |
| **App build** (new) | `npm run build`: the bundled main, preload and renderer in the desktop member's `out/` folder, which the **End-to-end tests** drive; not the installer. | Bundle, release build |
| **Electron binary** (new) | The Electron executable inside the installed `electron` package, which `npm ci` installs through the root `postinstall` script, so no test downloads it. | Electron download, runtime |
| **Single-instance lock** (new) | Electron's lock per **Data folder** that makes a second start focus the running window and quit. | Mutex, instance guard |
| **Debug port** (updated) | Chromium's remote debugging port on loopback, 9222 unless `DASHCASH_DEBUG_PORT` names another, open only when the app runs from `npm run dev`. | Inspector, DevTools port |
| **Startup error** (updated) | The native error box "DashCash couldn't start" shown, before quitting, when the **Data folder** or the **Database** cannot be opened or migrated, or when `DASHCASH_DEBUG_PORT` is no valid port in `npm run dev`. | Crash dialog |

## End-to-end tests and quarantine

| Term | Definition | Aliases to avoid |
| --- | --- | --- |
| **User flow** (new) | A goal the user reaches across pages, IPC and the **Database**, such as starting the app or importing a CSV. | Scenario, journey, use case |
| **End-to-end test** (new) | A Playwright test in `e2e/` that drives the **App build** through one **User flow**. | e2e, UI test, integration test |
| **App fixture** (new) | The Playwright fixture that gives each **End-to-end test** a fresh temporary **Data folder** and the launched app, and removes both afterwards. | Launcher, test harness |
| **Flaky test** (new) | A test that passes and fails on the same code. | Intermittent, unstable test |
| **Quarantine** (new) | The flaky-quarantine file in `quality/`: the **Flaky tests** left out of the end-to-end run until fixed or deleted. | Skip list, ignore list |
| **Quarantine entry** (new) | One test in the **Quarantine**, with its file, title, ticket, owner, the date it was added and an **Expiry date** at most 30 days later. | Exception, waiver |
| **Quarantine pattern** (new) | The regular expression built from one **Quarantine entry** that Playwright's `grepInvert` matches against a test's file, title and tags; it accepts either path separator and any tags after the title. | Grep, filter, skip pattern |
| **Entry date rules** (new) | The rules an **Audit exception** and a **Quarantine entry** share: added no later than today, and an **Expiry date** not before the added date and at most the limit after it (90 or 30 days). | Date checks, expiry logic |
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
- (new) Each **Quarantine entry** gives exactly one **Quarantine pattern**; the **Audit** and the **Quarantine check** apply the same **Entry date rules**, each with its own limit, and both take today as a parameter.
- (new) Every **Renovate PR** title is assembled from the **Commit-message parts**; a **Hold rule** keeps a dependency from getting a PR for the held update.
- (new) Each part of the **Gate wiring** has one gate folder; its **Problem finder**, if it has one, is the module beside the test.
- (new) The **Dangerous-git hook** and the **Claude folder guard** are Claude Code hooks; neither is a **Gate**.
- (new) The **Theme** holds every **Token**; a **Primitive** reads only **Tokens**, a **Component** combines **Primitives**, and a **Feature component** combines both and reads data.
- (new) Every **Primitive**, **Component** and **Feature component** has exactly one stories file with one or more **Stories**; the **Story check** fails **Verify** when the file is missing.
- (new) Each **Story** is one **Story test**; its **Play function** and the **Accessibility check** run inside it, and **Verify** runs every **Story test**.
- (new) **Changed-lines coverage** counts the unit tests and the **Story tests** together; below the **Coverage threshold** it fails **Verify**.
- (new) The Amount **Primitive** shows **Cents** in the **Money format**, coloured by **Polarity** unless its **Tone** says otherwise; the payoff uses the **Milestone tone**.

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
> **Dev:** "The flaky test is tagged `@slow` and lives in a subfolder of `e2e/`. Will it still run on my Windows machine?"
> **Domain expert:** "No. Its **Quarantine pattern** accepts either path separator and any tags after the title. The **Quarantine check** judges the entry by the same **Entry date rules** as an **Audit exception**, only with 30 days instead of 90."
> **Dev:** "Renovate opened nothing for a new TypeScript major. Is it broken?"
> **Domain expert:** "That is a **Hold rule**: TypeScript majors wait until typescript-eslint supports them, and a human lifts the rule. Every PR Renovate does open gets its title from the **Commit-message parts**, so it still reads `chore: [supply-chain] update npm dependencies`."
> **Dev:** "And if I break the daily job's wiring?"
> **Domain expert:** "Its gate test fails, and the **Problem finder** beside it names the missing step. Because the finder is **Shipping code**, **Mutation testing** also checks that its tests would notice."
> **Dev:** "I built a `HeadroomMeter` in the saving feature module. Is a Vitest test enough?"
> **Domain expert:** "No. It is a **Feature component**, so the **Story check** wants its stories file. Give it one **Story** per state, neutral, warning and danger, and a **Play function** where it reacts to the user. Each **Story** runs as a **Story test** in **Verify**."
> **Dev:** "The danger **Story** fails with 'ARIA meter nodes must have an accessible name'. The prototype shows no name."
> **Domain expert:** "That is the **Accessibility check**. Add the accessible name without changing what anyone sees, as the Switch's `ariaLabel` does. Only a colour-contrast failure is reported for review instead of failing, until the human settles the prototype's faint and muted colours."
> **Dev:** "The meter shows `−20,00 €`. Do I format it myself?"
> **Domain expert:** "Never. The amount is **Cents**; the Amount **Primitive** renders it in the **Money format** through the domain's formatter and colours it by **Polarity**, unless you pass a **Tone** such as `danger`. Colours come from **Tokens** of the **Theme**, never a hex in your styles."
> **Dev:** "My pull request is red on `check:coverage`, but every test passes."
> **Domain expert:** "Your **Changed-lines coverage** is under the **Coverage threshold**: some of your **Changed lines** run in no unit test and no **Story test**. The gate names them by file. Cover them; the threshold only goes up."

## Flagged ambiguities

- "feature" means both a checklist **Feature** and the renderer's `features/` **Layer**. Use **Feature** for the checklist row; say "feature module" or the folder path `features/<name>/` for the layer.
- "step" means both a **Refactor step** and a step of the import wizard (11). Always qualify it: **Refactor step** or "wizard step".
- "layer" means both a renderer **Layer** and a test layer (domain, story, end-to-end) in `docs/conventions.md`. Use **Layer** for the renderer; say "test layer" for the other.
- "status" means both **Ticket status** (`open`, `in-progress`, `done`) and **Feature status** (`planned`, `in-progress`, `done`, `refactored`). Name which one.
- "issue" appears in skill names (`prd-to-issues`, `issue-loop`) but the files are **Tickets**; GitHub issues are not used. Say **Ticket**.
- "check" is used for a **Gate**, a CI job and a GitHub status. A **Gate** is the rule; the **Required check** is the CI job the **Ruleset** waits for.
- "hook" (new) means a git hook (the **Commit-msg hook**) and a Claude Code hook (the **Claude folder guard**, the dangerous-git hook). Name which one; neither is a **Gate**, because CI decides.
- "exception" (new) means an **Audit exception** and a thrown error. Say **Audit exception** for the file entry.
- "allowlist" (new) is only the **License allowlist**; accepted advisories are **Audit exceptions**, not an allowlist.
- "threshold" (updated) means the **Break threshold**, the **Coverage threshold** and Stryker's `high` and `low` thresholds, which only colour the **Mutation report**. Say **Break threshold** for the one that fails a **Mutation run**, **Coverage threshold** for the one that fails **Verify** on **Changed lines**.
- "coverage" (updated) means test coverage of lines and Stryker's per-test coverage of **Mutants**. The gate judges only **Changed-lines coverage**, never the coverage of the whole code. A **Mutation score** is not coverage; a **Mutant** no test reaches is a **Surviving mutant**.
- "nightly" and "daily" (new) name the same schedule: the **Mutation run** is a job of the **Daily run**, not a workflow of its own.
- "mutation" (new) is the technique; one edit is a **Mutant**. Avoid "a mutation" for a single edit.
- "workflow" (new) means a GitHub Actions file and the planning-and-build workflow of `docs/conventions.md`. Say "CI workflow" for the file, or name it: the push workflow, the pull-request workflow, the **Daily run**.
- "app" (new) means the product, Electron's `app` object, the renderer's `App/` **Layer**, the `app:` area of **Channels** and the **App protocol**. Say "the app" for the product only, and name the others.
- "data folder" (new): the settings page labels it "Database folder" (verbatim copy, 23), and Electron calls its default location `userData`. In code and docs it is the **Data folder**; `userData` is only its default.
- "contract", "bridge" and "API" (new) are three things: the **Contract** is the types package, the **Bridge** is the runtime object in the page, and the renderer's `api/` folder holds the calls a feature makes through the **Bridge**. Avoid "API" alone.
- "version" (new) means the **App version**, the **Schema version** and a dependency's version. Name which.
- "build" (new) means the **App build**, the issue-loop's build step and the installer (21). Say **App build** for `npm run build`, "installer" for 21.
- "quarantine" and "exception" (new): a **Quarantine entry** takes a **Flaky test** out of the run; an **Audit exception** accepts an **Advisory**. Both expire, in different files, with different limits (30 and 90 days).
- "harness" (new): the checklist's "Playwright harness" is the Playwright config, the **App fixture** and `npm run test:e2e` together; the **App fixture** is only the per-test part.
- "flow" (new): a **User flow** is what one **End-to-end test** covers; a behaviour inside one component or module is never one, and gets a story or a Vitest test.
- "feature numbers" (new): on 2026-11-15 gate-maintenance was inserted as 05, and the planned features moved up by one (design-system 06 to data-settings 23). The design logs, PRDs, plans and tickets of 01 to 04 keep the numbers of their day; read their 05 to 22 as 06 to 23.
- "tag" (new) means a Playwright test tag (`@slow`), which a **Quarantine pattern** accepts, and a git tag, which only a release makes (21). Name which one.
- "hold" and "disabled" (new) both name a **Hold rule**, whatever Renovate option it uses (`enabled: false` or `allowedVersions`). Say **Hold rule**.
- "hook" (updated): the dangerous-git hook is now the **Dangerous-git hook**.
- "debug port" (new) is only the **Debug port** of `npm run dev`; the port Playwright opens to drive the **App build** is Playwright's own and not part of the app.
- "component" (new) means any React component and the components **Layer**. Say **Primitive**, **Component** or **Feature component** for the three kinds, and "React component" for any of them.
- "story" (new) means a Storybook **Story** and a PRD's user story. Say **Story** for Storybook and "user story" for the PRD.
- "variant" and "tone" (new): a Button's `variant` is its look (primary, secondary, ghost, danger), a Loader's its motion (draw, march, orbit, grow), a Logo's its form (full, mark). A **Tone** is always a colour role.
- "milestone" (new) means the **Milestone tone** of the mortgage payoff and a streak's next milestone (3, 6, 12 …, from 18). Name which.
- "amount" (new) means the Amount **Primitive** and a sum of money. Money is **Cents**; Amount is the **Primitive** that shows it.
- "token" (new) is only a **Token** of the **Theme**, never a parser or login token.
- "Chromium" (new) means the headless browser `npm ci` installs for the **Story tests**, not the Chromium inside the **Electron binary**, which runs the app and the **End-to-end tests**.
