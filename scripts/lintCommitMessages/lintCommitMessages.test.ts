import load from '@commitlint/load';
import { beforeAll, describe, expect, it } from 'vitest';
import { ROOT } from '../test-support/sampleRepository/sampleRepository.ts';
import { lintCommitMessages } from './lintCommitMessages.ts';

const EXPECTED_FORMAT = '<type>: [<feature>]';

// Headers in the forms the issue-loop and the planning chain write.
const CONVENTIONAL_HEADERS = [
  'docs: [sample] add prd',
  'docs: [sample] add tickets',
  'test: [sample] 01 add sample tests, RED',
  'feat: [sample] 01 add sample',
  'fix: [sample] 01 address review',
  'docs: [sample] 01 tick ci criterion',
];

describe('lintCommitMessages', () => {
  let config: Awaited<ReturnType<typeof load>>;

  beforeAll(async () => {
    config = await load({}, { cwd: ROOT, file: 'commitlint.config.js' });
  });

  it('reports nothing for no commits', async () => {
    expect(await lintCommitMessages([], config)).toEqual([]);
  });

  it('reports nothing for headers that follow the convention', async () => {
    expect(await lintCommitMessages(CONVENTIONAL_HEADERS, config)).toEqual([]);
  });

  it('reports nothing for merge, revert, fixup and squash commits', async () => {
    const messages = [
      "Merge branch 'main' into feat/01-sample",
      'Revert "feat: [sample] 01 add sample"\n\nThis reverts commit 1a2b3c4d.',
      'fixup! feat: [sample] 01 add sample',
      'squash! feat: [sample] 01 add sample',
    ];

    expect(await lintCommitMessages(messages, config)).toEqual([]);
  });

  it('reports a header off the pattern with the expected format', async () => {
    const violations = await lintCommitMessages(
      ['feat(sample): add sample'],
      config,
    );

    expect(violations).not.toEqual([]);
    for (const violation of violations) {
      expect(violation.subject).toBe('feat(sample): add sample');
    }
    expect(
      violations.map((violation) => violation.reason).join('\n'),
    ).toContain(EXPECTED_FORMAT);
  });

  it('names a commit with a body by its header', async () => {
    const violations = await lintCommitMessages(
      ['feat: [sample] 01 add sample\n\nexplains why the sample exists'],
      config,
    );

    expect(violations).not.toEqual([]);
    for (const violation of violations) {
      expect(violation.subject).toBe('feat: [sample] 01 add sample');
      expect(violation.reason).not.toBe('');
    }
  });

  it('reports the failing commits of a mixed range, and only those', async () => {
    const violations = await lintCommitMessages(
      [
        'feat: [sample] 01 add sample',
        'wip: [sample] 01 add sample',
        'fix: [sample] 01 address review',
        'feat: [Sample] 1 add sample',
      ],
      config,
    );

    expect(new Set(violations.map((violation) => violation.subject))).toEqual(
      new Set(['wip: [sample] 01 add sample', 'feat: [Sample] 1 add sample']),
    );
  });
});
