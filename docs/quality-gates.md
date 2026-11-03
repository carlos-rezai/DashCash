# Quality gates

Local checks help; the pipeline decides. Every check that matters runs in CI on every pull request, and `main` only accepts changes through a green pull request. The same rule applies to me and to any AI agent working in this repo.

## What changes compared to my earlier projects

Horizon and FamilyFlix had good instincts (TDD, guard tests, digest pinning) but the verification layer was missing: checks ran on my machine and could be skipped, and releases were built locally.

| Area | Horizon / FamilyFlix | DashCash |
| --- | --- | --- |
| Where gates run | Locally (husky, lint-staged) | CI on every PR; branch protection makes them binding |
| Entry point | Separate scripts | One `npm run verify`, same steps locally, in CI and for the agent |
| Warnings | Not enforced | ESLint zero warnings, TypeScript strict |
| Formatting | On commit only | `prettier --check` in CI |
| Dependencies | No audit, no update bot | Blocking audit with an exceptions file, Renovate |
| Secrets | API keys in `.env`, dev database committed | Push protection, gitleaks, a check that fails on tracked database or CSV files, invented fixtures only |
| Commits | Convention written down, not checked | Branch per feature, every commit checked by commitlint, merge commits keep each ticket readable |
| Review | None before merge | Every ticket reviewed by an agent with a fresh context; every feature reviewed by me before it reaches `main` |
| Architecture | Guard tests (FamilyFlix), not enforced | dependency-cruiser layer rules in CI |
| Coverage | Package installed, no threshold | Threshold on changed lines |
| Components | Tested indirectly | Every component has stories; stories run as tests |
| User flows | Manual release checklist | Playwright end-to-end tests against the built app |
| Releases | Built and published from my machine | Only from CI on a tag, built once, SBOM attached |
| Flaky tests | Not tracked | Quarantine file with ticket and expiry date |
| Test quality | Not measured | Mutation testing on the domain package |

## Rollout

Gates are features in [feature-checklist.md](feature-checklist.md), built in the same workflow as everything else. Each arrives with the first feature that needs it, so nothing is checked before there is something to check, and nothing is built for long without its check:

- **01 quality-gates:** the binding core. `npm run verify`, CI on every push and PR, branch protection, formatting, linting, strict types, unit tests, layer rules, commit and ticket checks, the data-file check, docs drift.
- **02 supply-chain:** audit with an exceptions file and expiry, license allowlist, gitleaks, Renovate, pinned actions, a daily run on `main`.
- **03 mutation-testing:** StrykerJS on the domain package and `scripts/`, before the features where the money math happens.
- **04 desktop-shell:** the first end-to-end test and flaky quarantine, before any test can turn flaky.
- **05 design-system:** stories as tests, the accessibility check, a story for every component, coverage on changed lines.
- **07 accounts:** the `Cents` type and its lint rule, with the first money.
- **20 release-pipeline:** release from a tag, SBOM, installer smoke test, visual regression.

Each new gate starts informative where it could block existing work, then blocks. Thresholds only go up: a monthly ten-minute review (lead time, failed runs, open exceptions, flaky tests, coverage and mutation score) raises them, and lowering one needs a written decision.

## Three layers of tests

Each layer answers a different question, so a change breaks exactly the tests that cover it.

1. **Vitest, domain** (`packages/domain`): is the money math right? Import parsing, rules, duplicates, transfers, projection, streak, headroom. Fast, pure, written test-first. This is where mutation testing runs.
2. **Storybook, components** (`*.stories.tsx`): does each component behave and look right in every state? Stories double as tests: `play` functions check interactions, the accessibility addon checks contrast and labels, and later screenshots catch visual changes. Stories also replace the prototype's component inventory as living documentation.
3. **Playwright, user flows** (`e2e/`): do the real flows work end to end in the real Electron app? Import a CSV, create an account, see the projection. Few tests, each covering one important path. The PRD names a feature's main flows, the ticket that completes a flow carries its end-to-end test as an acceptance criterion, and every pull request into `main` runs them all.

When a future change comes in, this split is what keeps it safe: a new feature gets stories and a flow test, and every existing story and flow must stay green.

## Rules that keep tests trustworthy

- **Fixed clock.** The design's "today" is 26 Oct 2026. Domain functions take today as a parameter; the renderer and Playwright use a fixed clock. Tests never depend on the day they run.
- **Fresh data per test.** End-to-end tests start the app with a temporary data folder and a seeded database, so tests never share state.
- **Screenshots from one environment.** Fonts render differently on Windows and Linux. Visual baselines are created and compared only in CI's container; updating them is a deliberate step, not a side effect.
- **Flaky equals broken.** A flaky test goes into quarantine with a ticket, an owner and an expiry date. When the date passes, the build fails until it is fixed or deleted.
