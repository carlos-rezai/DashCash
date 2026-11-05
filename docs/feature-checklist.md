# Feature Checklist

Every feature, shipped and planned, in build order. The number is the feature folder's number in `docs/features/` and the order it is built in. Gates are features too: each arrives with the first feature that needs it.

Status: `planned` → `in-progress` (feature branch open) → `done` (merged into `main`) → `refactored` (refactor merged).

| No | Feature | Contents | Status |
| --- | --- | --- | --- |
| 01 | quality-gates | Workspace, pinned Node, `.npmrc`, TypeScript strict, ESLint, Prettier, Vitest, `npm run verify`, CI on push and PR, branch protection, commitlint (with the `@` and `#` rule), ticket check, data-file check, dependency-cruiser, CODEOWNERS, docs-drift check | refactored |
| 02 | supply-chain | Audit with an exceptions file and expiry, license allowlist, gitleaks and push protection, Renovate, actions pinned by SHA, daily scheduled run, the pull-request job in its own workflow, local commit-msg hook, Claude folder guard for `~/.claude/settings.json` | refactored |
| 03 | mutation-testing | StrykerJS on `packages/domain` and `scripts/`, informative first, then a break threshold that only goes up | planned |
| 04 | desktop-shell | Electron main and preload with secure defaults and CSP, typed IPC bridge, SQLite and migrations, data folder, single instance, dev-only debug port, Playwright harness with the first end-to-end test, flaky quarantine | planned |
| 05 | design-system | Theme and tokens, primitives, components, Storybook with story tests, accessibility check and MCP, every component has a story check, coverage on changed lines, reviewer gets the Storybook MCP tools | planned |
| 06 | app-shell | AppShell, Sidebar with collapse, PageLayout, routing with persisted route, empty pages, SnackbarHost, splash, LoadingOverlay, reviewer gets the DevTools MCP tools | planned |
| 07 | accounts | Five account types, anchor, AccountList, AccountCard, AccountFormModal, delete | planned |
| 08 | categories | Kinds, 40 category colours, built-in Cash category, CategoryList, create, rename, delete-as-merge | planned |
| 09 | rules | Merchant normalisation, exact and contains rules, PayPal and Klarna purpose matching, RuleList | planned |
| 10 | csv-import | Import wizard steps 1, 2 and 5: file, bank profile detection, column mapping, preview, duplicates, balance check, summary, commit | planned |
| 11 | import-categorising | Import wizard step 3: rule application, manual change creates and propagates a rule, reset, built-in cash rule | planned |
| 12 | recurring-and-transfers | Import wizard step 4: recurring and transfer detection, transfer linking, credit card settlement, recurring items on the account detail | planned |
| 13 | uncategorised | UncategorisedPage, sidebar counter, save as exact rule | planned |
| 14 | imported-files | Archive of original CSVs: download, edit and move, delete file only or file and transactions | planned |
| 15 | projection | Typical spending (median), mortgage plan, credit card reset, AccountDetail with YearTable and projection assumptions, sparkline | planned |
| 16 | dashboard | BalanceChart with ranges, toggles and payoff, BalanceTable with edit mode, both persisted | planned |
| 17 | saving | Streak rule, goals, StreakStrip, HeadroomMeter, SavingPanel, goal card | planned |
| 18 | compare | CompareTable with months and years, like-for-like comparison | planned |
| 19 | import-reminders | Last import per account, stale state, reminder snackbar, Settings page, ReminderSettings | planned |
| 20 | release-pipeline | electron-builder NSIS installer, release from a version tag, SBOM, installer smoke test, visual regression | planned |
| 21 | auto-update | UpdateSettings, update check, update snackbars | planned |
| 22 | data-settings | Database folder move, backup and restore, export, start page, BankProfiles | planned |

**Release 1.0:** every feature through 22 merged.

## Later

| Feature | Contents |
| --- | --- |
| manual-entry | Add a transaction by hand, reconciled with the matching CSV row on the next import |
