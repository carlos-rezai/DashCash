---
status: done
---
# Renderer layer ladder

## Parent PRD

`prd.md`

## What to build

The renderer's **Layer rules** (second half of plan Phase 9; PRD
Implementation Decisions, "Layer rules"; design log Q40, Q42), added to
`.dependency-cruiser.js` and proven in `dependency-cruiser.test.ts`:

- the **Layer** ladder tokens → primitives → components → features →
  layouts → pages → App: a layer imports only from layers below it, the
  same layer allowed;
- a feature module under `features/<x>/` is reachable from outside it only
  through `features/<x>/index.ts`;
- the shared folders `api/`, `hooks/`, `utils/`, `types/`, `assets/` and
  `styles/` beside the ladder: every layer may import them, and they import
  only each other, `tokens/`, `packages/contract` and `packages/domain`.

`npm run lint:deps` enforces them in **Verify** from this ticket on.

## Acceptance criteria

- [x] For each **Layer**: an import from a layer below and from the same
      layer is allowed, an import from a layer above is forbidden.
- [x] An import of `features/<x>/index.ts` from another feature module or a
      page is allowed; an import of any other file inside `features/<x>/`
      from outside it is forbidden.
- [x] Each layer may import a shared folder; a shared folder may import
      another shared folder, `tokens/`, the contract and the domain, and is
      forbidden to import any ladder layer above `tokens/`.
- [x] Every case runs in a temporary tree cruised with the real config.
- [x] `npm run lint:deps` passes on the tree.
- [ ] CI's `verify` job is green.

## Blocked by

- Blocked by `10-boundary-layer-rules.md`

## User stories addressed

- User stories 40, 41, 44, 45
