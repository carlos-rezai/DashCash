---
status: open
---
# Content Security Policy

## Parent PRD

`prd.md`

## What to build

The page carries a strict **CSP**, the same in dev and in the **App
build** (plan Phase 2; PRD "Renderer"; design log Q17, Q18).

- `apps/desktop/src/renderer/index.html` gains one
  `<meta http-equiv="Content-Security-Policy">` with exactly
  `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'`.
  The page still has no script.
- "Start the app" also asserts that the **CSP** blocks `eval` in the page.
- `npm run dev` still opens the page with hot reload under the policy
  (checked by hand, recorded in the Notes).

## Acceptance criteria

- [ ] A RED commit extends "Start the app" and fails on it.
- [ ] `index.html` carries exactly the **CSP** of Q18, as one meta tag,
      and still no script.
- [ ] "Start the app" asserts that `eval` is blocked; loosening the
      **CSP** fails it.
- [ ] `npm run dev` opens the page under the policy with hot reload
      (checked by hand, recorded in the Notes).
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `05-app-protocol.md`

## User stories addressed

- User stories 17, 18, 19, 20, 83
