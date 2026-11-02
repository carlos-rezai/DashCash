---
status: open
---
# Commit-msg hook

## Parent PRD

`prd.md`

## What to build

The **Commit-msg hook** wired into git (plan Phase 9; PRD "Commit-msg
hook", "npm scripts" and "Gate tests", commit-msg hook; design log Q39,
Q41, Q42, Q44, A10):

- A committed hooks folder `.githooks/` with one file, `commit-msg`,
  tracked with mode `100755`: `#!/bin/sh`, then
  `node scripts/checkCommitMessage/checkCommitMessage.ts "$1"`, run from
  the repository root, where git runs hooks. Not `npm run` (Q42).
- `package.json`: script `prepare` set to
  `git config core.hooksPath .githooks`, which `npm ci` and `npm install`
  run; no hook manager.
- `gates/commitMsgHook/commitMsgHook.test.ts`: the hook is tracked with
  mode `100755`, starts with `#!/bin/sh` and runs the entry with `"$1"`;
  `prepare` is the hooks-path command; driving the hook with `sh` from the
  repository root on a temporary message file exits 0 for a valid header
  and for an empty message, and 1, printing the violation line, for an
  invalid header.
- `docs/conventions.md`, Folder structure: one line for `.githooks/`
  (local git hooks), in the style of the other lines.

`--no-verify` stays blocked for agents by the existing dangerous-git hook;
CI still decides (Q44).

This ticket is the approval to create exactly `.githooks/commit-msg` and
`gates/commitMsgHook/commitMsgHook.test.ts`, to add the `prepare` script
to `package.json`, and to add the line to `docs/conventions.md`.

## Acceptance criteria

- [ ] Driven with `sh` from the repository root, the hook exits 0 for a
      valid header and for an empty message, and exits 1 with the
      violation line for an invalid header.
- [ ] The gate test fails when the hook loses mode `100755`, its shebang,
      its command or `"$1"`, or when `prepare` changes.
- [ ] After `npm ci`, `git config core.hooksPath` reads `.githooks`.
- [ ] `docs/conventions.md` lists the hooks folder, and the docs-drift
      gate passes.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `12-commit-message-check.md`

## User stories addressed

- User stories 54, 60, 61, 62, 63
- User story 53 (at `git commit`)
