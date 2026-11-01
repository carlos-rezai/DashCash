import { fileURLToPath } from 'node:url';
import lint from '@commitlint/lint';
import load from '@commitlint/load';
import { beforeAll, describe, expect, it } from 'vitest';

type Config = Awaited<ReturnType<typeof load>>;
type LintOptions = NonNullable<Parameters<typeof lint>[2]>;

const ROOT = fileURLToPath(new URL('.', import.meta.url));

// The format the header-format rule's message shows when a header does not
// match the Commit header grammar at all.
const EXPECTED_FORMAT = '<type>: [<feature>]';

// The examples of docs/conventions.md (Commit messages) and the header forms
// the issue-loop and the planning chain write. Literal strings, never read
// from git history.
const ACCEPTED_HEADERS = [
  'test: [csv-import] 02 add duplicate detection, RED',
  'feat: [csv-import] 02 add duplicate detection',
  'fix: [csv-import] 02 address review',
  'docs: [csv-import] add prd',
  'test: [quality-gates] 06 add commit header gate tests, RED',
  'feat: [quality-gates] 06 add commit header gate',
  'fix: [quality-gates] 06 address review',
  'docs: [quality-gates] add tickets',
  'docs: [quality-gates] add design log and glossary',
  'docs: [quality-gates] 04 tick ci criterion',
  'refactor: [csv-import] 03 extract the profile parser',
  'chore: [quality-gates] turn off commit attribution',
  'chore: [quality-gates] 02 format claude settings',
  'ci: [quality-gates] pin workflow actions',
];

const UNKNOWN_TYPES = [
  'wip: [csv-import] 02 add duplicate detection',
  'style: [csv-import] 02 add duplicate detection',
  'build: [csv-import] 02 add duplicate detection',
  'perf: [csv-import] 02 add duplicate detection',
];

const FEATURES_NOT_KEBAB_CASE = [
  'feat: [CsvImport] 02 add duplicate detection',
  'feat: [csv_import] 02 add duplicate detection',
  'feat: [csv import] 02 add duplicate detection',
  'feat: [CSV-IMPORT] 02 add duplicate detection',
  'feat: [csv-import-] 02 add duplicate detection',
  'feat: [-csv-import] 02 add duplicate detection',
];

const NUMBERS_NOT_TWO_DIGITS = [
  'feat: [csv-import] 2 add duplicate detection',
  'feat: [csv-import] 002 add duplicate detection',
  'test: [csv-import] 2 add duplicate detection, RED',
  'fix: [csv-import] 102 address review',
  'feat: [csv-import] 2',
  'fix: [csv-import] 102',
  'docs: [csv-import] 7',
  'feat: [x] 2',
  'fix: [x] 102',
  'docs: [x] 7',
  'feat: [x] 02',
  'test: [x] 2, RED',
  'test: [x] 102, RED',
  'test: [x] 002, RED',
  'feat: [x] 02, RED',
];

const HEADERS_OFF_PATTERN = [
  'add duplicate detection',
  'Initial commit',
  'feat: add duplicate detection',
  'feat(csv-import): add duplicate detection',
  'feat [csv-import] 02 add duplicate detection',
  'feat:[csv-import] 02 add duplicate detection',
  'feat: csv-import 02 add duplicate detection',
  'feat: [csv-import]02 add duplicate detection',
  'feat: [csv-import] 02',
];

// Messages git or GitHub write themselves; the default ignores skip them,
// although none of them follows the Commit header grammar.
const IGNORED_MESSAGES = [
  "Merge branch 'main' into feat/01-csv-import",
  'Merge pull request #12 from sample/feat/01-csv-import',
  'Revert "feat: [csv-import] 02 add duplicate detection"\n\nThis reverts commit 1a2b3c4d.',
  'fixup! feat: [csv-import] 02 add duplicate detection',
  'squash! feat: [csv-import] 02 add duplicate detection',
];

// Descriptions at and just over the limit of 50 characters.
const DESCRIPTION_OF_50 = 'add a description that is exactly fifty chars long';
const DESCRIPTION_OF_51 = 'add a description that is fifty-one characters long';

const DESCRIPTIONS_ENDING_IN_FULL_STOP = [
  'feat: [csv-import] 02 add duplicate detection.',
  'docs: [csv-import] add prd.',
  'test: [csv-import] 02 add duplicate detection., RED',
];

const DESCRIPTIONS_OVER_50 = [
  `feat: [csv-import] 02 ${DESCRIPTION_OF_51}`,
  `docs: [csv-import] ${DESCRIPTION_OF_51}`,
  `test: [csv-import] 02 ${DESCRIPTION_OF_51}, RED`,
];

const RED_ON_OTHER_TYPES = [
  'feat: [csv-import] 02 add duplicate detection, RED',
  'fix: [csv-import] 02 address review, RED',
  'docs: [csv-import] add prd, RED',
  'refactor: [csv-import] 03 extract the profile parser, RED',
  'chore: [csv-import] turn off commit attribution, RED',
  'ci: [csv-import] pin workflow actions, RED',
];

// An @ or a # in each part of a message: header, body and trailer.
const MESSAGES_WITH_AT_OR_HASH = [
  ['an @ in the header', 'feat: [csv-import] 02 thank sample@example.invalid'],
  ['a # in the header', 'fix: [csv-import] 02 close issue #12'],
  [
    'an @ in the body',
    'feat: [csv-import] 02 add duplicate detection\n\nasked for by @sample',
  ],
  [
    'a # in the body',
    'feat: [csv-import] 02 add duplicate detection\n\nsee issue #12',
  ],
  [
    'an @ in a trailer',
    'feat: [csv-import] 02 add duplicate detection\n\nCo-Authored-By: Name <a@b.example>',
  ],
  [
    'a # in a trailer',
    'feat: [csv-import] 02 add duplicate detection\n\nRefs: #12',
  ],
];

let config: Config;

beforeAll(async () => {
  config = await load({}, { cwd: ROOT, file: 'commitlint.config.js' });
});

function lintMessage(message: string): ReturnType<typeof lint> {
  return lint(message, config.rules, {
    parserOpts: config.parserPreset?.parserOpts as LintOptions['parserOpts'],
    plugins: config.plugins,
    ignores: config.ignores,
    defaultIgnores: config.defaultIgnores,
  });
}

async function errorNames(message: string): Promise<string[]> {
  const result = await lintMessage(message);
  return result.errors.map((error) => error.name);
}

describe('commitlint config', () => {
  describe('accepts', () => {
    it.each(ACCEPTED_HEADERS)('%s', async (header) => {
      const result = await lintMessage(header);

      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it('a header with the trailing newline git stores', async () => {
      const result = await lintMessage(
        'feat: [csv-import] 02 add duplicate detection\n',
      );

      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    it.each([
      `feat: [csv-import] 02 ${DESCRIPTION_OF_50}`,
      `docs: [csv-import] ${DESCRIPTION_OF_50}`,
      `test: [csv-import] 02 ${DESCRIPTION_OF_50}, RED`,
    ])('a description of 50 characters: %s', async (header) => {
      const result = await lintMessage(header);

      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('rejects a description ending in a full stop', () => {
    it.each(DESCRIPTIONS_ENDING_IN_FULL_STOP)('%s', async (header) => {
      expect(await errorNames(header)).toContain('subject-full-stop');
    });
  });

  describe('rejects a description over 50 characters', () => {
    it.each(DESCRIPTIONS_OVER_50)('%s', async (header) => {
      expect(await errorNames(header)).toContain('subject-max-length');
    });
  });

  describe('rejects the RED suffix on a commit other than test', () => {
    it.each(RED_ON_OTHER_TYPES)('%s', async (header) => {
      expect(await errorNames(header)).toContain('red-only-on-test');
    });
  });

  describe('rejects an @ or a # anywhere in the message', () => {
    it.each(MESSAGES_WITH_AT_OR_HASH)('%s', async (_part, message) => {
      expect(await errorNames(message)).toContain('no-at-or-hash');
    });
  });

  describe('rejects an unknown type', () => {
    it.each(UNKNOWN_TYPES)('%s', async (header) => {
      expect(await errorNames(header)).toContain('type-enum');
    });
  });

  describe('rejects a feature that is not kebab-case', () => {
    it.each(FEATURES_NOT_KEBAB_CASE)('%s', async (header) => {
      const result = await lintMessage(header);

      expect(result.valid).toBe(false);
      expect(result.errors).not.toEqual([]);
    });
  });

  describe('rejects a ticket number that is not two digits', () => {
    it.each(NUMBERS_NOT_TWO_DIGITS)('%s', async (header) => {
      const result = await lintMessage(header);

      expect(result.valid).toBe(false);
      expect(result.errors).not.toEqual([]);
    });
  });

  describe('rejects a header off the pattern and shows the expected format', () => {
    it.each(HEADERS_OFF_PATTERN)('%s', async (header) => {
      const result = await lintMessage(header);
      const headerFormat = result.errors.find(
        (error) => error.name === 'header-format',
      );

      expect(result.valid).toBe(false);
      expect(headerFormat?.message).toContain(EXPECTED_FORMAT);
      expect(headerFormat?.message).toContain('<description>');
    });
  });

  it('rejects a body', async () => {
    expect(
      await errorNames(
        'feat: [csv-import] 02 add duplicate detection\n\nskips rows already imported',
      ),
    ).toContain('body-empty');
  });

  it('rejects a footer', async () => {
    expect(
      await errorNames(
        'feat: [csv-import] 02 add duplicate detection\n\nBREAKING CHANGE: the old profile format is gone',
      ),
    ).toContain('footer-empty');
  });

  describe('ignores', () => {
    it.each(IGNORED_MESSAGES)('%s', async (message) => {
      const result = await lintMessage(message);

      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });
  });
});
