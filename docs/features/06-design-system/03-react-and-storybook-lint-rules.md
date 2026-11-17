---
status: done
---
# React hooks and Storybook lint rules

## Parent PRD

`prd.md`

## What to build

Hook mistakes and story files Storybook cannot load fail lint (plan Phase
1, the lint rules; PRD "TypeScript and lint"; design log Q27, I1, I4).

- `eslint-plugin-react-hooks` and `eslint-plugin-storybook` at the root
  (Q39); `eslint.config.js` adds each one's recommended config.
- `gates/lint/lint.test.ts` gains two samples, linted as text the way its
  other samples are (I4): a hook called inside a condition is reported by
  `react-hooks/rules-of-hooks`; a stories file that breaks a rule of
  Storybook's recommended config (no default export) is reported by a
  `storybook/` rule. The stories sample is linted as if it were
  `apps/desktop/src/renderer/primitives/Icon/Icon.stories.tsx`, a path the
  renderer's project includes and the Storybook rules match.

This ticket is the approval to change exactly: the root `package.json`
(the two plugins), `package-lock.json`, `eslint.config.js`,
`gates/lint/lint.test.ts`, and `quality/audit-exceptions.json` only for an
**Advisory** with no fix.

## Acceptance criteria

- [x] A RED commit adds the two samples to `gates/lint/lint.test.ts`, which
      fail at their assertions.
- [x] Both plugins are exact root dev dependencies, the newest release at
      least 14 days old on the day of building; every licence the lockfile
      gains is listed in the ticket's Notes; a licence the **License
      allowlist** lacks stops the builder; an open **Advisory** gets an
      **Audit exception** with its reason, or the builder stops when a fix
      exists; `check:licenses` and `check:audit` pass.
- [x] A conditional hook call fails lint with `react-hooks/rules-of-hooks`;
      a stories file without a default export fails lint with a
      `storybook/` rule.
- [x] `npm run lint` passes on the repository.
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 108, 122

## Notes

Installed with a plain `npm install`: `eslint-plugin-react-hooks` 7.1.1
(2026-04-17) and `eslint-plugin-storybook` 10.6.5 (2026-10-27, the newest
release at least 14 days old; 10.6.6 and 10.6.7 are younger). Both accept
ESLint 10 as a peer.

Licences the lockfile gains: MIT (the two plugins, `hermes-estree`,
`hermes-parser`, `zod-validation-error`, and the nested `@babel/*` and
`@jridgewell/gen-mapping` packages) and ISC (nested `semver` 6.3.2). Both
are on the licence allowlist; `check:licenses` and `check:audit` pass, and no
Audit exception was needed.

The recommended react-hooks config reported the Playwright fixture callback
`use` in `e2e/test-support/appFixture/appFixture.ts` as the React hook. The
callback is renamed `provide`, so the code no longer reads as a hook; no rule
was weakened.

The storybook plugin's rule types do not fit ESLint 10's config types
(`tsc` rejects the config), so `eslint.config.js` casts the plugin's own
recommended config through `unknown` to `Linter.Config[]`; the config itself
is unchanged.
