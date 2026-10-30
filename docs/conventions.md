# Conventions

**(enforced)** = checked in CI.

## Workflow

grill-me → design-log → ubiquitous-language (with the human)
→ write-a-prd → prd-to-plan → prd-to-issues
→ issue-loop: tdd → build → review per ticket (unattended)
→ feature PR (human review)
→ request-refactor-plan → refactor → refactor PR (human review)

- Every change belongs to a ticket in `docs/features/`.
- TDD stops at RED: show the failing test, wait for a go (issue-loop: the ticket is the go).
- New domain terms go into `docs/ubiquitous-language.md` before they appear in code.
- Skills and agents live in `.claude/` and are committed.

## Branches and pull requests

- `main` is protected; changes land only through a green pull request **(enforced)**.
- One branch per feature, named after its folder: `feat/01-csv-import`. Planning docs and all tickets are committed there.
- The refactor of a feature gets its own branch after the feature is merged: `refactor/01-csv-import`.
- CI runs on every push to `feat/*` and `refactor/*` (`verify`) and on every PR into `main` (`verify:full`, end-to-end tests included).
- A PR into `main` needs every ticket in its folder at `status: done`, and a refactor PR every step of `refactor-plan.md` ticked **(enforced)**.
- PRs land as merge commits, never squashed, so every ticket commit stays readable.
- PR description: the feature folder and one line per ticket.

## Commit messages

```
<type>: [<feature>] <ticket no> <description>
test: [csv-import] 02 add duplicate detection, RED
feat: [csv-import] 02 add duplicate detection
fix: [csv-import] 02 address review
docs: [csv-import] add prd
```

- Every commit follows this format, not just the PR title **(enforced)**.
- `<feature>` is the feature folder name without its number (feature names are unique).
- Ticket commits carry the ticket number, and the ticket must exist **(enforced)**. `refactor:` commits carry the step number from `refactor-plan.md` instead. Planning commits and PR titles have none.
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci` (gate configuration).
- Description: lower case, imperative, no full stop, one line. If it doesn't fit, split the ticket.
- No `@` or `#` anywhere in commit messages or PR titles (GitHub turns them into mentions and links) **(enforced)**.

## Folder structure

```
.claude/                   skills, agents (issue-loop subagents)
.github/                   workflows, CODEOWNERS, PR template
apps/desktop/src/
  main/                    Electron main: db/, ipc/, updater/, test-support/
  preload/                 exposes the contract, nothing else
  renderer/
    App/                   router and providers, no domain logic
    api/                   IPC calls shared by 2+ features
    assets/ styles/ tokens/
    primitives/ components/ features/ layouts/ pages/
    hooks/                 cross-feature hooks, flat
    types/ utils/ test-support/
packages/domain/src/       money/ import/ rules/ projection/ saving/ test-support/
packages/contract/src/     typed IPC channels
e2e/                       Playwright flows
fixtures/                  invented test data only
quality/                   audit exceptions, flaky quarantine, license allowlist
scripts/
docs/                      concept.md, conventions.md, quality-gates.md, ubiquitous-language.md,
                           feature-checklist.md, design/, features/
```

## Features and tickets

One folder per feature, numbered in build order; its refactor plan lives there too:

```
docs/features/01-csv-import/
  design-log.md
  prd.md
  plan.md
  01-bank-profile-detection.md
  02-duplicate-detection.md
  refactor-plan.md      # after the feature is merged
```

Ticket header:

```markdown
---
status: open   # open | in-progress | done
---
# Duplicate detection
```

## Module filing

- Every module gets a folder named after itself.
- Components: PascalCase folder with `Name.tsx`, `Name.styles.ts`, `Name.test.tsx`, `Name.stories.tsx` (story required for primitives, components and feature components **(enforced)**).
- Everything else: camelCase folder with `name.ts` and `name.test.ts`, e.g. `domain/src/projection/mortgagePlan/`.
- Tests sit next to their module; only end-to-end tests live in `e2e/`.
- No `index.ts` per module. Category folders (`primitives/`, `components/`, `utils/`, `tokens/`) have one barrel each.
- Each feature has one `index.ts`; never import from inside another feature **(enforced)**.
- `test-support/` is never imported by shipping code **(enforced)**.
- An IPC call with one caller stays in its feature's `api/`; it moves to `renderer/api/` when a second feature needs it.
- No catch-all folders (`misc/`, `common/`, `helpers/`).

## Naming

| What | Style | Example |
| --- | --- | --- |
| Components | PascalCase | `HeadroomMeter` |
| Hooks | camelCase, `use` prefix | `useAccounts` |
| Functions, modules | camelCase, verb first | `normaliseMerchant` |
| Types | PascalCase, no `I` prefix | `RecurringItem` |
| Constants | UPPER_SNAKE_CASE | `MAX_COMPARE_COLUMNS` |
| Feature folders | lower-case | `features/import/` |
| IPC channels | `<area>:<action>` | `accounts:list` |
| E2E tests | kebab-case `.spec.ts` | `import-csv.spec.ts` |
| Docs, feature folders, tickets | kebab-case, numbered | `01-csv-import/02-duplicate-detection.md` |

Domain terms use the exact words from `docs/ubiquitous-language.md`.
