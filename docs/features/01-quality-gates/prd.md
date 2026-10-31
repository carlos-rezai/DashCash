# PRD: 01 quality-gates

> Source: `design-log.md` (Grill-me, 2026-10-31, Q1–Q54; Assumptions from
> write-a-prd). Terms in bold are defined in `docs/ubiquitous-language.md`.

## Problem Statement

DashCash promises that quality is something the pipeline proves, for the
human and for every AI agent alike: "Local checks help; the pipeline
decides" (`docs/quality-gates.md`). Today none of that exists. The
repository holds folders with `.gitkeep`, the docs and the design handoff:
no `package.json`, no compiler, no linter, no tests, no CI, and `main` has
no ruleset. The conventions are written down, and some are marked
**(enforced)**, but nothing enforces them. An agent can commit a message
with an `@` in it, name a ticket that does not exist, commit a bank CSV, or
import a Node module into the renderer, and nobody learns of it until a
human happens to look. That is exactly the failure of the earlier projects
(Horizon, FamilyFlix): checks that ran on one machine and could be skipped.

## Solution

One command, **Verify** (`npm run verify`), runs every gate of this feature
the same way on the developer's machine, inside every agent's loop and in
CI. A CI workflow runs **Verify** on every push to a `feat/*` or
`refactor/*` branch and runs **Verify full** plus the **Pull-request check**
on every pull request into `main`. A **Ruleset** on `main`, kept as code in
the repository, makes the **Required check** binding: `main` accepts changes
only through a green, up-to-date pull request that lands as a merge commit,
for the owner and the agents alike.

The gates of this feature are the binding core named in row 01 of
`docs/feature-checklist.md`: a workspace with a pinned Node and reproducible
installs, Prettier, ESLint with zero warnings, strict TypeScript, Vitest,
dependency-cruiser **Layer rules**, commitlint with the `@` and `#` rule, the
**Ticket check**, the **Pull-request check**, the data-file check, the docs
drift check, CODEOWNERS and the PR template. Every gate is itself tested: if
a rule stops enforcing, a test goes red.

The last step is manual: the human applies the **Ruleset** once, with the
script this feature ships, after the first green `pull-request` run (design
log Q50). The agents' token cannot reach the branch-protection API.

## User Stories

**Workspace and installs**

1. As the developer, I want one npm workspace root covering `apps/*` and
   `packages/*`, so that every later feature adds its member without
   touching the root layout.
2. As the developer, I want the workspace root to be private, ES-module and
   MIT-licensed, so that nothing is published by accident and every script
   uses the same module system.
3. As the developer, I want each **Workspace member** to get its
   `package.json` only with its first code, so that no empty package fails
   the typecheck.
4. As the developer, I want Node pinned to one exact version in `.nvmrc`
   and `engines.node`, so that my machine, the agents and CI run the same
   tooling.
5. As the developer, I want `npm ci` to fail on a different Node version,
   so that a wrong runtime stops the install instead of producing subtle
   differences.
6. As the developer, I want new dependencies saved at exact versions and
   the lockfile committed, so that every install is reproducible.
7. As CI, I want to install with `npm ci` from the committed lockfile and
   the Node version in `.nvmrc`, so that a green run means the same
   dependency tree everywhere.

**Verify**

8. As the developer, I want one command, `npm run verify`, that runs every
   gate except end-to-end tests, so that "is this done?" has one answer.
9. As an AI agent, I want `npm run verify` to be the same command CI runs,
   so that green locally predicts green in CI.
10. As the developer, I want **Verify** to stop at the first failing gate
    and exit non-zero, so that I see the first problem without scrolling.
11. As the developer, I want the gates in **Verify** in a fixed order
    (format, lint, types, layer rules, tests, commits, tickets, data files,
    docs drift), so that cheap checks fail before slow ones.
12. As the developer on Windows, I want every npm script to work in
    `cmd.exe` as well as in CI's Linux shell, so that **Verify** runs the
    same everywhere.
13. As the developer, I want `npm run verify:full` to exist now and run
    **Verify**, so that agents and CI can already call it and later features
    only add build and end-to-end tests to it.
14. As the developer, I want a test that fails when a gate is dropped from
    **Verify**, from **Verify full** or from the CI jobs, so that a gate
    cannot stop running silently.

**Formatting**

15. As the developer, I want `npm run format:check` to fail on any file
    Prettier would change, so that formatting never shows up in review.
16. As the developer, I want `npm run format` to fix formatting in place,
    so that a red format check is one command away from green.
17. As the developer, I want Prettier's defaults with single quotes, so
    that the code matches the TypeScript in the design spec.
18. As the developer, I want Markdown, the design handoff and generated
    output (lockfile, build and test output) left out of Prettier, so that
    hand-written tables and the verbatim handoff are never rewritten.

**Linting**

19. As the developer, I want `npm run lint` to fail on any error or any
    warning, so that warnings cannot pile up.
20. As the developer, I want typed linting with typescript-eslint's strict
    type-checked rules, so that unsafe code is caught before review.
21. As the developer, I want ESLint never to report formatting, so that
    ESLint and Prettier never contradict each other.
22. As the developer, I want `any` rejected, so that the "no `any` types"
    rule of the build skill is checked, not hoped for.
23. As the developer, I want `console.log` rejected while gate scripts may
    still report through `console.error`, so that no debug output is
    committed and the gates can still explain a failure.
24. As the developer, I want every `@ts-ignore` and `@ts-expect-error`
    rejected unless explicitly disabled, so that each such exception is
    visible in review as the "Ask first" rule requires.
25. As the developer, I want focused and skipped tests (`.only`, `.skip`)
    rejected, so that no test is switched off unnoticed.
26. As the developer, I want unused `eslint-disable` directives reported, so
    that a stale exception does not linger after its cause is gone.
27. As the developer, I want `Date.now()` and an argument-less `new Date()`
    rejected inside `packages/domain`, so that "today" stays a parameter.
28. As the developer, I want the documentation and the prototype's
    JavaScript ignored by ESLint, so that the handoff is never linted.

**Types**

29. As the developer, I want `npm run typecheck` to run the compiler in
    strict mode with `noUncheckedIndexedAccess`, so that the strictness the
    README promises is checked.
30. As the developer, I want the gate scripts, their tests and the root tool
    configs type-checked too, so that the gates are held to the standard
    they enforce.
31. As the developer, I want the gate scripts to run as TypeScript directly
    under Node, so that no loader dependency is needed.
32. As the developer, I want one strict base compiler configuration that
    later **Workspace members** extend, so that every package is equally
    strict.

**Unit tests**

33. As the developer, I want `npm test` to run every Vitest test once and
    exit, so that **Verify** and CI run the same tests.
34. As the developer, I want tests found next to their module by the
    `*.test.ts` / `*.test.tsx` naming, so that end-to-end `*.spec.ts` files
    never run in Vitest.
35. As the developer, I want tests that never touch the network, the real
    clock or each other's files, so that they are deterministic.

**Layer rules**

36. As the developer, I want `npm run lint:deps` to fail when
    `packages/domain` imports anything outside itself (another workspace,
    an npm package, a Node built-in), so that the domain stays pure.
37. As the developer, I want `packages/contract` to import only
    `packages/domain`, so that the contract stays the thin typed boundary.
38. As the developer, I want the renderer barred from Node built-ins,
    `electron`, `main/` and `preload/`, so that the renderer talks to main
    only through the contract.
39. As the developer, I want the preload to import only `electron` and the
    contract, so that it exposes the contract and nothing else.
40. As the developer, I want each renderer **Layer** to import only from
    layers below it (tokens → primitives → components → features → layouts
    → pages → App), same-layer imports allowed, so that the layering is
    enforced as `CLAUDE.md` says.
41. As the developer, I want an import into another feature module allowed
    only through that module's `index.ts`, so that features stay
    independent.
42. As the developer, I want `test-support/` importable only from tests,
    stories, other `test-support/` files and `e2e/`, so that **Shipping
    code** never depends on test helpers.
43. As the developer, I want the renderer allowed to import
    `packages/domain`, so that money is formatted through the domain as
    `CLAUDE.md` requires.
44. As the developer, I want the renderer's shared folders (`api/`,
    `hooks/`, `utils/`, `types/`, `assets/`, `styles/`) importable from every
    layer while they import only each other, tokens, the contract and the
    domain, so that shared code cannot reach up the ladder.
45. As the developer, I want every **Layer rule** proven by one allowed and
    one forbidden import in a test, although the folders hold no code yet,
    so that the rules work before the first feature relies on them.

**Commit convention**

46. As the developer, I want every commit in the **Branch range** checked
    against the **Commit header** `<type>: [<feature>] <nn> <description>`,
    so that the convention is enforced, not just written down.
47. As an AI agent, I want a commit with an unknown type, a feature name
    that is not kebab-case, a number that is not two digits, or a header
    that does not match the pattern at all rejected with the expected
    format in the message, so that I can fix it at once.
48. As the developer, I want the description lower case, without a full
    stop and at most 50 characters, so that the history stays scannable.
49. As the tdd-writer agent, I want the suffix `, RED` allowed on `test:`
    commits only and not counted in the 50 characters, so that RED commits
    follow the documented example.
50. As the developer, I want any `@` or `#` anywhere in a commit message
    rejected, header, body and trailers alike, so that GitHub never turns
    commit text into mentions or links.
51. As the developer, I want a commit message with a body or footer
    rejected, so that every commit is one line and explanations go into
    tickets and the design log.
52. As the developer, I want merge commits, reverts and `fixup!`/`squash!`
    commits ignored, so that text GitHub or git generates never fails the
    gate.
53. As the developer on `main`, I want the commit checks to pass with an
    empty **Branch range**, so that **Verify** works on every branch.
54. As an AI agent, I want the commit checks to fail with a clear "fetch
    `origin/main`" message when `origin/main` is missing, so that a gate
    that cannot run never passes silently.

**Ticket check**

55. As the developer, I want every commit's `[<feature>]` to name an
    existing **Feature folder**, so that no commit belongs to a feature that
    does not exist.
56. As the developer, I want every **Ticket number** in a commit to name an
    existing **Ticket** in that folder, so that every change belongs to a
    ticket.
57. As the developer, I want every `refactor:` commit's number to name a
    **Refactor step** in the folder's `refactor-plan.md`, ticked or not, so
    that refactors are traceable to their plan.
58. As the developer, I want `feat`, `fix` and `test` commits to carry a
    **Ticket number** and `refactor` commits a step number, while `docs`,
    `chore` and `ci` may omit it, so that **Planning commits** pass and
    **Ticket commits** cannot lose their ticket.
59. As the developer, I want a `docs`, `chore` or `ci` commit that does
    carry a number to name an existing ticket, so that a number is never
    decorative.
60. As the developer, I want every commit on `feat/<NN>-<feature>` and
    `refactor/<NN>-<feature>` to name that branch's feature, so that a
    stray commit never reaches `main` in the wrong pull request.
61. As the developer, I want references checked against the tree at `HEAD`,
    so that a ticket added by a later planning commit still counts.
62. As the developer, I want the ticket check to skip exactly the commits
    the commit convention ignores, so that merge commits never fail it.

**Pull-request check**

63. As the human who merges, I want a feature pull request blocked until
    its folder holds at least one **Ticket** and every ticket reads
    `status: done`, so that no half-built feature reaches `main`.
64. As the human who merges, I want a refactor pull request blocked until
    its `refactor-plan.md` exists and every **Refactor step** is ticked, so
    that a refactor lands complete.
65. As the human who merges, I want the PR title checked against the
    **Commit header** grammar without a number, including the `@`/`#` rule,
    so that the merge commit's title follows the convention too.
66. As the developer, I want a pull request from any branch that is not
    `feat/*` or `refactor/*` rejected, so that every change belongs to a
    ticket.
67. As an AI agent mid-feature, I want the **Pull-request check** to run
    only in CI's pull-request job, not in **Verify** or **Verify full**, so
    that open tickets never fail my local run.
68. As the developer, I want the PR title passed to the check through an
    environment variable, never interpolated into the shell, so that a
    crafted title cannot inject commands.
69. As the developer, I want the ticket status read from the front matter
    even when the line carries the template's trailing comment, so that a
    ticket copied from the template is read correctly.

**Data files**

70. As the developer, I want **Verify** to fail when a tracked `*.db`,
    `*.sqlite` or `*.csv` file (case-insensitive) sits outside `fixtures/`,
    so that real bank data never lands in git, even through `git add -f`.
71. As the developer, I want SQLite journal and WAL files (`*.db-*`,
    `*.sqlite-*`) rejected the same way, so that a database cannot leak in
    pieces.
72. As the developer, I want any tracked `.env` or `.env.*` file except
    `.env.example` rejected, so that secrets never land in git.
73. As the developer, I want each rejected file named in the output, so
    that I know which file to remove.

**Docs drift**

74. As the developer, I want **Verify** to fail when `README.md`,
    `CLAUDE.md` or a top-level `docs/*.md` names a path that no longer
    exists, so that the docs cannot drift from the repository.
75. As the developer, I want relative Markdown links resolved from the
    linking file's folder, without their `#anchor`, so that links such as
    `feature-checklist.md` from `docs/` are checked correctly.
76. As the developer, I want inline-code paths that start with a top-level
    folder (`.claude/`, `.github/`, `apps/`, `packages/`, `e2e/`,
    `fixtures/`, `quality/`, `scripts/`, `docs/`) checked from the
    repository root, so that the folder structure in the docs stays true.
77. As the developer, I want fenced code blocks, URLs and spans with
    placeholders (`<`, `>`, `*`, `{`, `…`, spaces) skipped, so that example
    paths never raise false alarms.
78. As the developer, I want a path to count as existing when git tracks it
    or a file under it, so that folders kept by `.gitkeep` count.
79. As the developer, I want the drift check to pass on today's docs, so
    that it starts green.

**CI**

80. As the developer, I want a CI job `verify` on every push to `feat/**`
    and `refactor/**` that runs `npm run verify`, so that every pushed
    ticket is checked.
81. As the human who merges, I want a CI job `pull-request` on every pull
    request into `main` that runs `npm run verify:full` and then the
    **Pull-request check**, so that one job decides whether a merge is
    allowed.
82. As CI, I want the full history checked out, so that the commit checks
    can compute the **Branch range** against `origin/main`.
83. As CI, I want Node set up from `.nvmrc` with the npm cache, so that
    runs are fast and on the pinned version.
84. As the human who merges, I want the pull-request job to test GitHub's
    merge of the branch into the current `main`, so that green means green
    after the merge.

**Ruleset and ownership**

85. As the repository owner, I want the **Ruleset** on `main` kept as code,
    so that the protection is reviewable and reproducible.
86. As the repository owner, I want the **Ruleset** to require a pull
    request with zero approvals, so that I, the only maintainer, can merge
    my own pull requests after the agent review.
87. As the repository owner, I want the **Required check** `pull-request`
    green and the branch up to date with `main` before a merge, so that a
    merge never lands on top of an unchecked `main`.
88. As the repository owner, I want merge commits as the only merge method,
    in the **Ruleset** and in the repository settings, so that every ticket
    commit stays readable on `main`.
89. As the repository owner, I want deletion and force pushes of `main`
    blocked and no bypass actors, so that the same rule applies to me and
    to every agent.
90. As the repository owner, I want one script that creates or updates the
    **Ruleset** and sets the repository to merge commits only through
    `gh api`, so that applying the protection is one command.
91. As the repository owner, I want a test that fails when the **Ruleset**'s
    required check stops naming the CI pull-request job or allows another
    merge method, so that the two files cannot drift apart.
92. As the repository owner, I want CODEOWNERS to name me for every file
    and, explicitly, for the gate files of `CLAUDE.md`'s "Ask first" list,
    so that ownership is documented and my review is requested.
93. As the repository owner, I want code-owner review not required by the
    **Ruleset**, so that I am not blocked by being unable to approve my own
    pull request.
94. As the issue-loop, I want a PR template with the feature folder, one
    line per ticket and an "Assumptions" section, so that every feature
    pull request has the body the conventions ask for.

**Manual step**

95. As the repository owner, I want the PRD and the final ticket to state
    that I apply the **Ruleset** by hand, once, after the first green
    `pull-request` run, so that the one step no agent can do is not
    forgotten.

## Implementation Decisions

Locations of every file are in the design log's **Files** table; this
section names modules and their interfaces.

**Workspace and toolchain**

- Root `package.json`: `private`, `"type": "module"`, licence MIT,
  workspaces `apps/*` and `packages/*`, `engines.node` equal to `.nvmrc`
  (`24.14.0`, Q8). No member `package.json` yet (Q6); members will be
  `@dashcash/<folder>` (Q7).
- `.npmrc`: `engine-strict=true`, `save-exact=true` (Q9). Lockfile
  committed; CI uses `npm ci` (Q10).
- Development dependencies (exact versions): `typescript`, `@types/node`
  for Node 24, `prettier`, `eslint`, `@eslint/js`, `typescript-eslint`,
  `eslint-config-prettier`, `@vitest/eslint-plugin` (focused and disabled
  tests), `vitest`, `@commitlint/load`, `@commitlint/lint`,
  `@commitlint/is-ignored`, `dependency-cruiser`, and `yaml` for reading the
  workflow in the wiring test.
- Compiler: a strict base configuration (`strict`,
  `noUncheckedIndexedAccess`, `module`/`moduleResolution` `nodenext`,
  `target` ES2023, `noEmit`, `isolatedModules`, `verbatimModuleSyntax`,
  `erasableSyntaxOnly`, `allowImportingTsExtensions`; Q11). The root
  project extends it and covers the gate scripts, the root tool configs and
  their tests; it adds `allowJs` and `checkJs` so the JavaScript tool
  configs are type-checked too (Assumption A6). Later members extend the
  base and join through project references (Q13).
- Gate scripts run as `node <script>.ts` through Node's type stripping
  (Q12). npm scripts hold no `$(...)`, globs or pipes (Q14).

**npm scripts (the public interface of the gates)**

| Script | Runs |
| --- | --- |
| `format` / `format:check` | Prettier write / `prettier --check .` |
| `lint` | `eslint . --max-warnings 0` |
| `typecheck` | `tsc` on the root project |
| `lint:deps` | dependency-cruiser with the project config over `apps`, `packages`, `scripts` and `e2e` |
| `test` | `vitest run` |
| `check:commits` | the `checkCommits` script |
| `check:tickets` | the `checkTickets` script |
| `check:data-files` | the `checkDataFiles` script |
| `check:docs-drift` | the `checkDocsDrift` script |
| `check:pr` | the `checkPullRequest` script (CI pull-request job only) |
| `verify` | the nine gates above, from `format:check` to `check:docs-drift`, in Q23's order, chained with `&&` (A5) |
| `verify:full` | `verify` (03 adds build and end-to-end tests; Q25) |

**Prettier and ESLint**

- Prettier: defaults plus `singleQuote: true`; ignores `*.md`,
  `docs/design/`, the lockfile and build and test output (Q15, Q16).
- ESLint flat config, typed: `@eslint/js` recommended, typescript-eslint
  `strictTypeChecked`, then project rules, then `eslint-config-prettier`
  last (Q17, Q18):
  - `@typescript-eslint/no-explicit-any`;
  - `no-console`, allowing only `warn` and `error` (A9);
  - `@typescript-eslint/ban-ts-comment` for `@ts-ignore` and
    `@ts-expect-error`;
  - the Vitest plugin's no-focused-tests and no-disabled-tests rules;
  - `linterOptions.reportUnusedDisableDirectives` as an error;
  - for files under `packages/domain`: `Date.now()` and `new Date()` without
    arguments forbidden (restricted syntax, with a message naming "today is
    a parameter").
  - Ignored: `docs/`, `node_modules/` and build and test output.

**Vitest**

- One root config, `vitest run`, collecting only `*.test.ts` and
  `*.test.tsx` (`*.spec.ts` is Playwright's naming, `docs/conventions.md`
  Naming). No network, a temporary folder per test that needs files, no
  clock dependence (Q20).

**Gate script modules**

Every gate script is a module named verb-first with a pure core (inputs in,
violations out) that tests exercise and a thin entry that reads git and the
file system, prints and sets the exit code (Q21).

- Shared result shape: `Violation = { subject: string; reason: string }`.
  The subject is a commit header, a path or a PR title.
- Output (A9): one line per violation, `<subject>: <reason>`, written with
  `console.error`; exit code 1 when there is any violation, otherwise exit
  0 without output.
- `readBranchRange` (shared by the commit and ticket checks, A8):
  - `resolveBranchName(env, currentBranch): string | undefined`, pure:
    `GITHUB_HEAD_REF`, then `GITHUB_REF_NAME`, then the current branch
    (Q35); empty values are skipped.
  - `readBranchRange(cwd): { branch; commits: { hash; message }[] }`:
    `git merge-base origin/main HEAD`..`HEAD` (Q24). When `origin/main`
    cannot be resolved it throws an error telling the caller to fetch
    `origin/main`, and the entries exit 1 with that message (A1).
- **Commit convention** (commitlint config, Q27–Q31):
  - The config is the single source of the header grammar (A7). Its parser
    preset holds the header pattern
    `<type>: [<feature>]( <nn>)? <description>(, RED)?` with the parts
    `type`, `scope` (the feature), `ticket`, `subject` (the description
    without the suffix) and `red`, so that the description rules never see
    `, RED`.
  - Rules: type enum `feat`, `fix`, `refactor`, `test`, `docs`, `chore`,
    `ci`; subject lower case, no trailing full stop, at most 50 characters;
    `body-empty` and `footer-empty`; default ignores.
  - Plugin rules: `header-format` (the header must match the pattern; the
    message shows the expected format), `red-only-on-test` (the `, RED`
    suffix only on `test:`), `no-at-or-hash` (no `@` or `#` anywhere in the
    raw message).
  - `checkCommits`: core `lintCommitMessages(messages: string[], config):
    Promise<Violation[]>` with `@commitlint/lint`; the entry loads the
    config with `@commitlint/load` and lints every commit of
    `readBranchRange`.
- **Ticket check** (Q33–Q35, A2):
  - Core `checkTicketReferences(commits: string[], trackedPaths: string[],
    readFile: (path: string) => string, branch: string | undefined):
    Violation[]`. It parses each header with the pattern from the
    commitlint config, skips the messages commitlint's `isIgnored` skips,
    and leaves a header that does not parse to the commit check.
  - Rules: the feature names a folder `docs/features/<NN>-<feature>/`;
    `feat`/`fix`/`test` need a number naming a ticket file
    `<nn>-<name>.md` in it; `refactor` needs a number naming a step line
    `- [ ] <nn> …` or `- [x] <nn> …` in its `refactor-plan.md`;
    `docs`/`chore`/`ci` may carry a number, which must then name a ticket;
    on a `feat/<NN>-<feature>` or `refactor/<NN>-<feature>` branch the
    feature equals the branch's feature.
  - The entry takes tracked paths and file contents from `HEAD`
    (`git ls-tree -r --name-only HEAD`, `git show HEAD:<path>`), so the
    check reads the committed tree, not the working tree.
- **Pull-request check** (Q36, Q37, Q32):
  - Core `checkPullRequest(input: { branch: string | undefined; title:
    string | undefined; trackedPaths: string[]; readFile: (path: string) =>
    string; lintTitle: (title: string) => Promise<Violation[]> }):
    Promise<Violation[]>`.
  - `feat/<NN>-<feature>`: the folder exists, holds at least one ticket,
    and every ticket's front-matter `status:` reads `done` (a trailing
    `# …` comment, as in the conventions' template, is ignored).
  - `refactor/<NN>-<feature>`: `refactor-plan.md` exists and has no `- [ ]`
    step.
  - Any other branch, or no branch: a violation (Q37).
  - Title: linted with the commitlint config, and it must carry no number;
    a missing title is a violation.
  - The entry reads the title from `PR_TITLE` and the branch through
    `resolveBranchName`; the workflow sets `PR_TITLE` from the event, never
    inside the shell command (Q32).
- **Data-file check** (Q38): core `findDataFiles(trackedPaths: string[]):
  string[]`, case-insensitive: `*.db`, `*.db-*`, `*.sqlite`, `*.sqlite-*`,
  `*.csv` outside `fixtures/`; `.env` and `.env.*` anywhere except
  `.env.example`. The entry uses `git ls-files`.
- **Docs-drift check** (Q39): core `findDocsDrift(docs: { path: string;
  text: string }[], trackedPaths: string[]): Violation[]`. Relative link
  targets resolve from the linking file's folder, without `#anchor` or
  query; inline-code paths resolve from the repository root; fenced blocks,
  URLs and placeholder spans are skipped; a path exists when a tracked path
  equals it or lies under it. The entry reads `README.md`, `CLAUDE.md` and
  `docs/*.md` and uses `git ls-files`. The subject of a violation is
  `<doc>: <named path>`.
- `applyBranchProtection` (Q48–Q50):
  - Core `planRulesetRequests(ruleset, existing: { id: number; name: string
    }[]): { method: 'POST' | 'PUT' | 'PATCH'; endpoint: string; body:
    unknown }[]`: create the ruleset when none of that name exists,
    otherwise update it by id, and always patch the repository to merge
    commits only (squash and rebase off).
  - The entry resolves the repository with `gh`, lists its rulesets and
    sends each request with `gh api`, the body on standard input. It is run
    by the human, not by CI or an agent.

**Layer rules** (dependency-cruiser config, Q40–Q44)

- Rules exactly as Q40, with Q41 (renderer may import the domain) and Q42
  (shared renderer folders beside the ladder). The SQLite rule waits for 03
  (Q43).
- Paths in the rules are relative to the cruise's base directory, so a test
  tree that mirrors the repository's folders and is cruised from its own
  root exercises the real rules.
- A test file is `*.test.ts(x)`, `*.stories.tsx`, anything under
  `test-support/` or under `e2e/`; everything else is **Shipping code**.

**CI workflow** (Q45–Q47)

- One workflow. Triggers: `push` to `feat/**` and `refactor/**`;
  `pull_request` into `main`.
- Job `verify` (push only): checkout with `fetch-depth: 0`, setup-node from
  `.nvmrc` with the npm cache, `npm ci`, `npm run verify`.
- Job `pull-request` (pull request only): the same setup on GitHub's
  default merge ref (A3), then `npm run verify:full`, then
  `npm run check:pr` with `PR_TITLE` set from the event's title.
- `ubuntu-latest`; actions referenced by version tag (SHA pinning is 02's).

**Ruleset, ownership and template** (Q48–Q53)

- The **Ruleset** file targets `main`: pull request required with 0
  approvals and no code-owner review; required status check
  `pull-request`, strict (up to date); allowed merge method `merge` only;
  deletion and non-fast-forward blocked; no bypass actors.
- Gate wiring test (Q51 extended by A4): reads the root `package.json`, the
  workflow, the **Ruleset** and `.nvmrc`, and checks that `verify` runs the
  nine gates in order, `verify:full` runs `verify`, the `verify` job runs
  `npm run verify`, the `pull-request` job runs `npm run verify:full` and
  `npm run check:pr`, the required check names the `pull-request` job,
  `merge` is the only merge method, and `.nvmrc` equals `engines.node`.
- CODEOWNERS: the owner (`carlos-rezai`, from the `origin` remote) for `*`
  and, explicitly, for each gate file of `CLAUDE.md`'s "Ask first" list.
- PR template: feature folder, one line per ticket, `## Assumptions`.

**Out of the agents' hands**

- Applying the **Ruleset** is manual (Q50): after the first green
  `pull-request` run, the owner runs the `applyBranchProtection` script
  with a `gh` login that has admin rights on the repository. The last
  ticket ends with this step as its handover note, not as an acceptance
  criterion an agent must tick.

## Testing Decisions

- A good test drives a gate through its public interface and asserts what
  the gate reports: the violations of a pure core, the messages of a tool
  run with the real config. It never asserts on internals such as regex
  parts or rule order.
- All tests are Vitest tests (test layer "domain" of
  `docs/conventions.md`, applied to the gate scripts and tool configs).
  This feature has no React code, so no stories, and no app user flow, so
  no Playwright test (Q4). Its main flows are developer and CI flows
  (verify locally, push, open a pull request, merge), checked by the CI
  runs the issue-loop watches, not by end-to-end tests.
- Modules and their tests:
  - each gate script's pure core: table-driven cases, one passing and at
    least one failing case per rule, including the edge cases in the user
    stories (empty range, missing title, `, RED` on a non-test commit,
    commented ticket status, upper-case `.CSV`, journal files, anchors,
    placeholder spans);
  - `readBranchRange`: `resolveBranchName` as a pure function, and the git
    part against a temporary repository with a fake `origin/main` ref,
    including the missing-ref error;
  - the commitlint config: through `@commitlint/lint` with the loaded
    config, valid and invalid headers for every rule, including the
    conventions' examples and headers in the form the issue-loop writes,
    given as literal strings, never read from git history;
  - the ESLint config: through ESLint's Node API (`lintText` with a file
    path), one violating and one clean sample per project rule, with the
    domain rule tested under a `packages/domain` path and outside it;
  - the dependency-cruiser config: small trees in a temporary folder, one
    allowed and one forbidden import per rule, cruised with the real config
    (Q44);
  - `planRulesetRequests`: create versus update, and the repository patch;
  - the gate wiring test (A4).
- Code that must violate a rule is written to a temporary folder or passed
  as text inside the test, never committed (Q22): committed violations
  would fail the gates themselves.
- Deterministic: no network, no real clock, a fresh temporary folder per
  test, no shared state (`docs/quality-gates.md`, Rules that keep tests
  trustworthy).
- Prior art: none. This feature writes the repository's first code and its
  first tests; its config tests become the pattern for later gates (02, 04,
  06).

## Out of Scope

- Everything `docs/quality-gates.md` (Rollout) assigns to later features:
  audit with exceptions, licence allowlist, gitleaks, Renovate, actions
  pinned by SHA, the daily run (02); Playwright, the build and end-to-end
  tests in `verify:full`, flaky quarantine, the SQLite layer rule (03);
  Storybook, stories as tests, the accessibility check, the story check,
  coverage, React and Storybook lint rules (04); `Cents` and its lint rule
  (06); Stryker (07); release, SBOM, visual regression and the Windows
  build (20).
- `package.json` files for `domain`, `contract` and `desktop` (Q6).
- Local git hooks, husky and lint-staged (Q54).
- A live check that the remote **Ruleset** still matches the file (Q51).
- Checking that a description is imperative: left to review (Q27).
- Changes to `CLAUDE.md`'s "Ask first" list (design log, Trade-offs).
- Applying the **Ruleset** from a ticket: the human does it (Q50).

## Further Notes

- No CI workflow runs on pull requests yet, so by `docs/conventions.md`
  (Workflow) `/feature-pipeline` runs only the planning for this feature,
  and the tickets are built interactively with `tdd` and `build`.
- Each gate checks the whole **Branch range** from the moment it lands, so
  every commit already on `feat/01-quality-gates`, including the planning
  commits, must satisfy it; they were written in the format.
- The tickets of this feature create the gate files that `CLAUDE.md`'s
  "Ask first" list names. The tickets are the go for creating them (A10);
  any later change to them still needs the human's go.
- Manual step for the human, after the first green `pull-request` run:
  apply the **Ruleset** once with the `applyBranchProtection` script (Q50).
- Assumptions taken while writing this PRD are in the design log under
  "Assumptions from write-a-prd" (A1–A10).
