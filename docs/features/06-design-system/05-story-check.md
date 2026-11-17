---
status: open
---
# Story check

## Parent PRD

`prd.md`

## What to build

No component ships without its **Stories** (plan Phase 3; PRD "Story
check"; design log Q31, A4).

- `scripts/checkStories/`: the core `findMissingStories(paths)` returns one
  violation for every `<Name>/<Name>.tsx` with a PascalCase `<Name>`
  directly under the renderer's `primitives/`, `components/` or
  `features/<feature>/` whose `<Name>.stories.tsx` is not in the list. The
  entry reads the tracked and the untracked, not ignored paths through the
  shared `runGit` reader and reports through `runGate`, one line
  `<path of Name.tsx>: has no <Name>.stories.tsx` per missing file (A4).
- `check:stories` = `node scripts/checkStories/checkStories.ts`; **Verify**
  runs it right after `lint:deps`.

Prior art: the other gate entries' suites with
`scripts/test-support/sampleRepository/`.

This ticket is the approval to change exactly: the root `package.json`
(`check:stories` and **Verify**), `gates/verifyScripts/verifyScripts.test.ts`
and `gates/test-support/verifyGates/verifyGates.ts`.

## Acceptance criteria

- [ ] A RED commit adds the core, entry and **Gate wiring** tests, which
      fail.
- [ ] `findMissingStories` reports a component without its stories file in
      each of the three places and nothing when the file is there;
      lower-case folders, nested folders, `layouts/`, `pages/`, a name that
      does not match its folder and non-component files are not
      components.
- [ ] The entry, in a temporary sample repository, exits 0 when every
      component has its stories, and 1 with one A4 line per missing file,
      an untracked component included and an ignored one left out.
- [ ] **Verify** runs `check:stories` right after `lint:deps`, pinned by
      the **Gate wiring** test; it passes on the repository.
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      83 (`npm run test:mutation`).
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 112, 113, 121 (`check:stories`)
