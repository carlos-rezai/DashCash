---
status: in-progress
---
# Renovate titles from commit-message parts

## Parent PRD

`prd.md`

## What to build

`renovate.json` stops writing whole messages and titles (plan Phase 3; PRD
"Renovate"; design log Q13, Q14, Q19, and the Renovate sketch under
Design).

- `renovate.json`: no object sets `commitMessage` or `prTitle`. The root
  sets `commitMessagePrefix: "chore: [supply-chain]"`. Each of the three
  group rules (npm, github actions, node), `lockFileMaintenance` and
  `vulnerabilityAlerts` sets its own lower-case `commitMessageAction`,
  `commitMessageExtra: ""` and `commitMessageSuffix: ""`. Lockfile
  maintenance sets `commitMessageTopic: "the lockfile"` (action
  `refresh`), vulnerability alerts `"vulnerable dependencies"` (action
  `fix`); group rules set no topic, so a group's topic is its `groupName`,
  and the npm group's `groupName` becomes `npm dependencies`.
- `gates/renovate/renovate.ts`, `findRenovateViolations`: assembles each
  PR-opening scope's title the way Renovate's default template does (root
  prefix, then the scope's action, its topic or `groupName`, extra and
  suffix; trimmed, inner whitespace collapsed) and runs it through
  commitlint and the **Pull-request check**, and checks that it names the
  feature `supply-chain`. It fails on a `commitMessage` or `prTitle`
  anywhere, a `{{` in any **Commit-message part**, a scope that leaves its
  action or extra to Renovate, and a group rule that sets
  `commitMessageTopic`. The check "a PR title is the same text as its
  commit message" goes. The existing checks on base settings, lockfile
  maintenance and vulnerability alerts stay.
- `gates/renovate/renovate.test.ts`: the committed config passes; one
  failing sample per new rule.

`renovate.json` is not a gate file (Q19). This ticket is the approval to
change `gates/renovate/renovate.ts` and `gates/renovate/renovate.test.ts`.

## Acceptance criteria

- [ ] A RED commit adds the new gate checks and their failing samples, and
      the committed `renovate.json` fails them.
- [ ] No object in `renovate.json` sets `commitMessage` or `prTitle`.
- [ ] The assembled titles are exactly `chore: [supply-chain] update npm
      dependencies`, `chore: [supply-chain] update github actions`,
      `chore: [supply-chain] update node`, `chore: [supply-chain] refresh
      the lockfile` and `chore: [supply-chain] fix vulnerable
      dependencies`; each passes commitlint, names the feature
      `supply-chain` and passes the **Pull-request check**; none holds a
      package name or version.
- [ ] A failing sample for each new rule: a `commitMessage`, a `prTitle`, a
      `{{` in a part, a missing action, a missing extra, a group rule with
      a topic, a title that fails commitlint.
- [ ] The existing checks on base settings, lockfile maintenance and
      vulnerability alerts stay and pass.
- [ ] The ticket's Notes name the manual step after the merge: the human
      checks the titles of the first **Renovate PRs** of each kind (Q36).
- [ ] `npm run verify` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 16, 17, 18, 19, 26, 27, 61
