// The gates of Verify, in their fixed order. Every ticket that adds a gate
// inserts it here at its place.
export const VERIFY_GATES = [
  'format:check',
  'lint',
  'typecheck',
  'lint:deps',
  'check:stories',
  'test',
  'test:stories',
  'check:coverage',
  'check:commits',
  'check:tickets',
  'check:data-files',
  'check:docs-drift',
  'check:licenses',
  'check:audit',
  'check:quarantine',
];
