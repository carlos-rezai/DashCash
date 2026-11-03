---
status: done
---
# Push protection

## Parent PRD

`prd.md`

## What to build

GitHub secret scanning with **Push protection** as repository settings in
code (plan Phase 7; PRD "Gate script modules", `applyBranchProtection`;
design log Q30). The repository `PATCH` that `planRulesetRequests` in
`scripts/applyBranchProtection/` already plans gains
`security_and_analysis` with `secret_scanning` and
`secret_scanning_push_protection`, both `{ status: 'enabled' }`, beside the
merge settings. The module keeps its name; every other planned request is
unchanged. The script is still run only by the human; no test calls
GitHub.

Then, by hand, after the feature is merged (not a criterion): the human
runs the apply script again so that push protection is switched on.

## Acceptance criteria

- [x] The request-planning tests show the repository patch carrying both
      secret-scanning settings beside the merge settings, for both the
      create and the update path.
- [x] Every other planned request is unchanged; the existing tests pass
      unchanged.
- [x] `npm run verify` and CI's `verify` job are green.

## Blocked by

None — can start immediately.

## User stories addressed

- User story 39
