import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { reportViolations, type Violation } from './reportViolations.ts';

describe('reportViolations', () => {
  let errorSpy: MockInstance<typeof console.error>;
  let logSpy: MockInstance<typeof console.log>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes one <subject>: <reason> line per violation to standard error', () => {
    const violations: Violation[] = [
      { subject: 'exports/statement.csv', reason: 'data file is tracked' },
      { subject: 'feat: [sample] 01 add thing', reason: 'ticket missing' },
    ];

    reportViolations(violations);

    expect(errorSpy.mock.calls).toEqual([
      ['exports/statement.csv: data file is tracked'],
      ['feat: [sample] 01 add thing: ticket missing'],
    ]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('returns exit code 1 when there is a violation', () => {
    expect(
      reportViolations([{ subject: 'app.db', reason: 'data file is tracked' }]),
    ).toBe(1);
  });

  it('returns exit code 0 without output when there is none', () => {
    expect(reportViolations([])).toBe(0);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
