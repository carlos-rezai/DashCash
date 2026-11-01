import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import {
  reportViolations,
  runGate,
  type Violation,
} from './reportViolations.ts';

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

describe('runGate', () => {
  let errorSpy: MockInstance<typeof console.error>;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    originalExitCode = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  it('reports the violations of a synchronous check and sets exit code 1', async () => {
    await runGate(() => [
      { subject: 'app.db', reason: 'data file is tracked' },
    ]);

    expect(errorSpy.mock.calls).toEqual([['app.db: data file is tracked']]);
    expect(process.exitCode).toBe(1);
  });

  it('awaits an asynchronous check and reports its violations', async () => {
    await runGate(() =>
      Promise.resolve([{ subject: 'a.csv', reason: 'data file is tracked' }]),
    );

    expect(errorSpy.mock.calls).toEqual([['a.csv: data file is tracked']]);
    expect(process.exitCode).toBe(1);
  });

  it('sets exit code 0 without output when the check finds nothing', async () => {
    await runGate(() => Promise.resolve([]));

    expect(errorSpy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('writes the message of a thrown error as one line and sets exit code 1', async () => {
    await runGate(() => {
      throw new Error('git is missing');
    });

    expect(errorSpy.mock.calls).toEqual([['git is missing']]);
    expect(process.exitCode).toBe(1);
  });

  it('writes a rejected non-error value as a string and sets exit code 1', async () => {
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the test rejects with a non-Error on purpose
    await runGate(() => Promise.reject('plain failure'));

    expect(errorSpy.mock.calls).toEqual([['plain failure']]);
    expect(process.exitCode).toBe(1);
  });
});
