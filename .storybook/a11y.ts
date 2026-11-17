// The Accessibility check's parameters for every Story (design log D1): any
// axe violation, colour contrast included, fails the Story test. No rule is
// changed. This module imports nothing so the gate test can load it in Node.
export const a11y = { test: 'error' } as const;
