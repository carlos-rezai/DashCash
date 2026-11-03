---
status: in-progress
---
# Renovate groups

## Parent PRD

`prd.md`

## What to build

The remaining three Renovate groups (plan Phase 8; PRD "Renovate config";
design log Q36, A13), in `renovate.json`, each with its fixed
`commitMessage` and a `prTitle` of exactly the same text (one format,
design log Implementation Results, D1):

- Node: the dependency `node` in both the `nvm` manager (`.nvmrc`) and the
  npm manager's `engines` (`engines.node`), in one group, so that both
  files change in one PR; the `engines` update is enabled explicitly if
  Renovate's defaults skip it, and this rule wins over the npm packages
  group: `chore: [supply-chain] update node`.
- Lockfile maintenance, enabled: `chore: [supply-chain] refresh the
  lockfile`.
- Vulnerability alerts: `chore: [supply-chain] fix vulnerable
  dependencies`, with no `[SECURITY]` suffix.

`gates/renovate/renovate.test.ts` checks the new messages and titles
through its existing rules, and gains: the Node rule covers both the `nvm`
manager and `engines.node`; lockfile maintenance is enabled; the
vulnerability-alert title carries no suffix.

## Between 10 and this ticket

`10-renovate-config.md` ends green with the Renovate gate test active
(design log, Implementation Results, D4). This ticket adds groups the
existing test then checks; it starts no gate.

## Acceptance criteria

- [ ] The three groups' messages and titles pass the existing message and
      title checks of the gate test.
- [ ] The gate test fails for a Node rule covering only one of `.nvmrc`
      and `engines.node`, for lockfile maintenance disabled, and for a
      vulnerability-alert title with a suffix.
- [ ] No dependency is added.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `10-renovate-config.md`

## User stories addressed

- User stories 48, 49
- User story 52 (the new groups)
