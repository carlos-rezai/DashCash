# Plan: 01 quality-gates

> Source PRD: `prd.md`. Decisions: `design-log.md` (Q1–Q54, A1–A10,
> P1–P3). Terms in bold are defined in `docs/ubiquitous-language.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: none. This feature has no React code.
- **IPC channels**: none. This feature has no main or renderer code.
- **Schema**: none. No database yet; the SQLite **Layer rule** waits for
  03 (Q43).
- **Workspace**: one npm **Workspace** root, private, ES module, MIT,
  workspaces `apps/*` and `packages/*`; no **Workspace member** gets a
  `package.json` in this feature (Q6). Node `24.14.0` in `.nvmrc` and
  `engines.node`; `.npmrc` with `engine-strict` and `save-exact`; committed
  lockfile, `npm ci` in CI.
- **Compiler**: a strict base configuration that later members extend, and
  a root project over the gate scripts, the root tool configs and their
  tests (Q11, Q13, A6). Gate scripts run as `node <script>.ts` (Q12).
- **Public interface: npm scripts.** `format`, `format:check`, `lint`,
  `typecheck`, `lint:deps`, `test`, `check:commits`, `check:tickets`,
  `check:data-files`, `check:docs-drift`, `check:pr`, `verify`,
  `verify:full`. No `$(...)`, globs or pipes in any script (Q14).
- **Verify order** (Q23), chained with `&&` (A5): `format:check` → `lint` →
  `typecheck` → `lint:deps` → `test` → `check:commits` → `check:tickets` →
  `check:data-files` → `check:docs-drift`. Each phase inserts its gate at
  its place in this order (P2). `verify:full` runs `verify` (Q25).
  `check:pr` is never part of either (Q26).
- **Gate script shape** (Q21, A9): `scripts/<name>/<name>.ts` with its test
  beside it; a pure core (inputs in, `Violation[]` out) and a thin entry
  that reads git and the file system. `Violation = { subject: string;
  reason: string }`. Output: one `<subject>: <reason>` line per violation
  on standard error, exit 1; otherwise exit 0 silently.
- **Tool configs**: at the repository root where the tools find them, as
  JavaScript ES modules except the Vitest config (Q19); each config is
  tested beside it through the tool's Node API, with violating code written
  to a temporary folder or passed as text, never committed (Q22).
- **Header grammar**: one pattern, in the commitlint config's parser preset,
  with the parts `type`, `scope`, `ticket`, `subject`, `red`; every other
  gate reads it from there (A7).
- **Branch range**: one shared module resolves the branch name
  (`GITHUB_HEAD_REF`, `GITHUB_REF_NAME`, current branch) and reads
  `git merge-base origin/main HEAD`..`HEAD`; a missing `origin/main` fails
  with "fetch `origin/main`" (Q24, Q35, A1, A8).
- **CI**: one workflow; job `verify` on push to `feat/**` and
  `refactor/**`, job `pull-request` on pull requests into `main` on
  GitHub's default merge ref (A3). Both: full history, Node from `.nvmrc`
  with the npm cache, `npm ci`, `ubuntu-latest`, actions by version tag
  (Q45–Q47).
- **Ruleset**: `.github/rulesets/main.json`, **Required check**
  `pull-request` (Q48–Q51).
- **Gate wiring test**: one test reads the root `package.json`, the
  workflow, `.nvmrc` and, once it exists, the **Ruleset**, and fails when
  a gate drops out of the wiring (A4, P2).

---

## Phase 1: Workspace, Verify and CI

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 29, 30,
31, 32, 33, 34, 35, 80, 81, 82, 83, 84

### What to build

The tracer bullet: an npm **Workspace** root on the pinned Node with a
committed lockfile, strict TypeScript over the root project, Vitest, and
the first **Verify** (`typecheck`, then `test`) with **Verify full**
running **Verify**. The CI workflow runs **Verify** on every push to
`feat/**` and `refactor/**` and **Verify full** on every pull request into
`main`. The first test is the gate wiring test: it pins the gates present
so far in their Q23 order, `verify:full` running `verify`, the `verify`
job running `npm run verify`, the `pull-request` job running
`npm run verify:full`, and `.nvmrc` equal to `engines.node`. Vitest and
the wiring test land here, not later, because `tsc` fails on a project
without inputs and `vitest run` fails without tests (P1).

### Acceptance criteria

- [ ] `npm ci` installs from the committed lockfile on Node `24.14.0` and
      fails on another Node version.
- [ ] No **Workspace member** has a `package.json`; the workspace globs are
      in place for later members.
- [ ] `npm run typecheck` runs the compiler in strict mode with
      `noUncheckedIndexedAccess` over the root project, JavaScript configs
      included, and is green.
- [ ] `npm test` runs every `*.test.ts(x)` once, ignores `*.spec.ts`, and
      is green.
- [ ] `npm run verify` runs `typecheck` then `test`, stops at the first
      failure with a non-zero exit, and runs in `cmd.exe` and in CI.
- [ ] `npm run verify:full` runs `npm run verify`.
- [ ] The gate wiring test fails when a gate is removed from `verify`,
      reordered, or dropped from a CI job, and when `.nvmrc` and
      `engines.node` differ.
- [ ] A push of the branch runs the `verify` job green in CI.

---

## Phase 2: Formatting

**User stories**: 11, 15, 16, 17, 18

### What to build

Prettier with its defaults and single quotes, ignoring Markdown, the
design handoff, the lockfile and build and test output. `format:check`
becomes the first gate of **Verify**, `format` writes in place, and the
wiring test expects `format:check` first.

### Acceptance criteria

- [ ] `npm run format:check` fails on any file Prettier would change and
      passes on the tree.
- [ ] `npm run format` fixes formatting in place.
- [ ] Markdown, `docs/design/`, the lockfile and generated output are
      never checked or rewritten.
- [ ] `verify` runs `format:check` first; the wiring test expects it there.
- [ ] CI's `verify` job is green.

---

## Phase 3: Data-file check

**User stories**: 11, 70, 71, 72, 73

### What to build

The first gate script, and the pattern every later one follows: a pure
core that takes the tracked paths and returns the forbidden ones, and a
thin entry that reads `git ls-files`, prints one line per file on standard
error and exits 1. It rejects `*.db`, `*.db-*`, `*.sqlite`, `*.sqlite-*`
and `*.csv` outside `fixtures/`, case-insensitive, and `.env` / `.env.*`
anywhere except `.env.example` (Q38). `check:data-files` joins **Verify**
at its place.

### Acceptance criteria

- [ ] The core's table-driven tests cover every pattern, upper-case
      extensions, journal and WAL files, files under `fixtures/` and
      `.env.example`.
- [ ] A forced (`git add -f`) data file fails the gate and is named in the
      output; an empty result exits 0 without output.
- [ ] `verify` runs `check:data-files` at its Q23 place; the wiring test
      expects it there.
- [ ] CI's `verify` job is green.

---

## Phase 4: Linting

**User stories**: 11, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28

### What to build

Typed ESLint with `@eslint/js` recommended, typescript-eslint
`strictTypeChecked`, the project rules (no `any`, `no-console` allowing
only `warn` and `error`, `ban-ts-comment`, no focused or disabled tests,
unused disable directives as errors, and in `packages/domain` no
`Date.now()` or argument-less `new Date()`), then `eslint-config-prettier`
last. `docs/` and generated output are ignored. `lint` joins **Verify**
with zero warnings allowed, and the code of phases 1–3 passes it.

### Acceptance criteria

- [ ] The config test lints one violating and one clean sample per project
      rule through ESLint's Node API; the domain rule fails under a
      `packages/domain` path and passes outside it.
- [ ] `npm run lint` fails on any error or warning and passes on the tree.
- [ ] ESLint reports no formatting rule that Prettier owns.
- [ ] `verify` runs `lint` after `format:check`; the wiring test expects it
      there.
- [ ] CI's `verify` job is green.

---

## Phase 5: Docs-drift check

**User stories**: 11, 74, 75, 76, 77, 78, 79

### What to build

A gate script that reads `README.md`, `CLAUDE.md` and the top-level
`docs/*.md`, collects relative Markdown link targets (resolved from the
linking file's folder, without `#anchor` or query) and inline-code paths
that start with a top-level folder (resolved from the root), skips fenced
blocks, URLs and placeholder spans, and reports each path that no tracked
path equals or contains, as `<doc>: <named path>` (Q39).
`check:docs-drift` joins **Verify** last.

### Acceptance criteria

- [ ] The core's tests cover relative links from `docs/`, anchors,
      inline-code paths, fenced blocks, URLs, every placeholder character
      and folders kept by `.gitkeep`.
- [ ] A renamed or deleted path named in a doc fails the gate, naming the
      doc and the path.
- [ ] The gate passes on today's docs.
- [ ] `verify` runs `check:docs-drift` last; the wiring test expects it
      there.
- [ ] CI's `verify` job is green.

---

## Phase 6: Commit convention

**User stories**: 11, 46, 47, 48, 49, 50, 51, 52, 53, 54

### What to build

The commitlint config as the single source of the **Commit header**
grammar: the parser preset with its parts, the type enum, the subject
rules (lower case, no full stop, at most 50 characters without `, RED`),
`body-empty` and `footer-empty`, the default ignores, and the plugin rules
`header-format`, `red-only-on-test` and `no-at-or-hash`. The shared
**Branch range** module, and the commit gate that lints every commit of
the range. `check:commits` joins **Verify**; every commit already on the
branch passes it (P3).

### Acceptance criteria

- [ ] The config test, through `@commitlint/lint` with the loaded config,
      accepts the conventions' examples and the issue-loop's header forms,
      and rejects an unknown type, a non-kebab feature, a one- or
      three-digit number, a malformed header (showing the expected format),
      an upper-case or full-stop description, a 51-character description,
      `, RED` on a non-test commit, a body, a footer, and `@` or `#`
      anywhere; merge, revert and `fixup!`/`squash!` messages are ignored.
- [ ] The **Branch range** module resolves the branch name in Q35 order
      (pure tests) and reads the range from a temporary repository with a
      fake `origin/main`, including an empty range and the missing-ref
      error.
- [ ] `check:commits` passes on `main`, fails with "fetch `origin/main`"
      when the ref is missing, and passes on the branch's own history.
- [ ] `verify` runs `check:commits` after `test`; the wiring test expects
      it there.
- [ ] CI's `verify` job is green.

---

## Phase 7: Ticket check

**User stories**: 11, 55, 56, 57, 58, 59, 60, 61, 62

### What to build

A gate script over the **Branch range** that parses each header with the
commitlint pattern, skips what commitlint ignores, and checks against the
tree at `HEAD`: the feature names a **Feature folder**; `feat`/`fix`/`test`
carry a **Ticket number** naming a **Ticket**; `refactor` carries a number
naming a **Refactor step**, ticked or not; `docs`/`chore`/`ci` may carry a
number, which must then name a **Ticket**; on `feat/<NN>-<feature>` and
`refactor/<NN>-<feature>` every commit names that branch's feature.
`check:tickets` joins **Verify** after `check:commits`.

### Acceptance criteria

- [ ] The core's tests cover each rule with one passing and one failing
      case, a **Planning commit**, a merge commit, an unparsable header
      (left to the commit gate) and a wrong-feature commit.
- [ ] The entry reads paths and contents from `HEAD`, not the working tree.
- [ ] The gate passes on the branch's own history.
- [ ] `verify` runs `check:tickets` after `check:commits`; the wiring test
      expects it there.
- [ ] CI's `verify` job is green.

---

## Phase 8: Pull-request check

**User stories**: 63, 64, 65, 66, 67, 68, 69, 81

### What to build

A gate script for pull requests into `main`: on `feat/<NN>-<feature>` the
folder holds at least one **Ticket** and every **Ticket status** reads
`done` (a trailing template comment ignored); on
`refactor/<NN>-<feature>` `refactor-plan.md` exists with no unticked
**Refactor step**; any other branch fails; the PR title follows the
**Commit header** grammar without a number, `@`/`#` rule included, and a
missing title fails. The title comes from `PR_TITLE`, set by the workflow
from the event, never inside the shell command. The `pull-request` job
runs `check:pr` after `verify:full`; neither **Verify** nor **Verify full**
runs it.

### Acceptance criteria

- [ ] The core's tests cover open, `in-progress` and `done` tickets, a
      status line with the template comment, an empty folder, ticked and
      unticked steps, a missing plan, another branch, a title with a
      number, with `@` or `#`, and no title.
- [ ] `check:pr` is not part of `verify` or `verify:full`; the wiring test
      fails if it is, and fails if the `pull-request` job stops running it
      after `npm run verify:full`.
- [ ] The workflow passes the title only through `PR_TITLE`.
- [ ] CI's `verify` job is green.

---

## Phase 9: Layer rules

**User stories**: 11, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45

### What to build

The dependency-cruiser config with every **Layer rule** of Q40–Q42: a pure
`packages/domain`, a contract that imports only the domain, a renderer
without Node built-ins, `electron`, `main/` or `preload/`, a preload that
imports only `electron` and the contract, the renderer **Layer** ladder
(tokens → primitives → components → features → layouts → pages → App,
same layer allowed), feature modules reachable only through their
`index.ts`, `test-support/` only from tests, stories, `test-support/` and
`e2e/`, the renderer allowed to import the domain, and the shared renderer
folders beside the ladder. `lint:deps` over `apps`, `packages`, `scripts`
and `e2e` joins **Verify** after `typecheck`.

### Acceptance criteria

- [ ] The config test cruises small trees in a temporary folder with the
      real config: one allowed and one forbidden import per rule.
- [ ] `npm run lint:deps` passes on the tree.
- [ ] `verify` runs `lint:deps` after `typecheck`; the wiring test expects
      it there.
- [ ] CI's `verify` job is green.

---

## Phase 10: Ruleset and ownership

**User stories**: 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95

### What to build

The **Ruleset** as code: pull request with 0 approvals and no code-owner
review, **Required check** `pull-request`, strict, merge commits only, no
deletion or force push, no bypass actors. The apply script plans its
`gh api` requests in a pure core (create or update the ruleset by name,
always patch the repository to merge commits only) and sends them from a
thin entry run only by the human. The wiring test also checks that the
required check names the `pull-request` job and that `merge` is the only
merge method. CODEOWNERS names the owner for `*` and each "Ask first"
gate file; the PR template holds the feature folder, one line per ticket
and `## Assumptions`.

### Acceptance criteria

- [ ] The core's tests cover create versus update and the repository patch.
- [ ] The wiring test fails when the **Ruleset**'s required check stops
      naming the `pull-request` job or allows another merge method.
- [ ] CODEOWNERS and the PR template exist with the content above.
- [ ] `npm run verify` and CI's `verify` job are green.
- [ ] Handover note, not an agent's criterion: after the first green
      `pull-request` run, the owner applies the **Ruleset** once with the
      apply script and a `gh` login with admin rights (Q50).
