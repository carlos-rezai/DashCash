// The single source of the Commit header grammar:
//   <type>: [<feature>] [<nn>] <description>[, RED]
// The parser preset holds the full pattern. The type is any lower-case word,
// so that type-enum names an unknown type; the feature is kebab-case; the
// ticket number is exactly two digits; the description starts with a
// lower-case letter, because docs/conventions.md requires a lower-case
// imperative description. Requiring a letter first means a ticket number that
// is not exactly two digits can never be read as the start of the description,
// so it is rejected.
const HEADER_PATTERN =
  /^([a-z]+): \[([a-z0-9]+(?:-[a-z0-9]+)*)\] (?:(\d{2}) )?([a-z].*?)(?:, (RED))?$/;

const EXPECTED_FORMAT = '<type>: [<feature>] [<nn>] <description>[, RED]';

const TYPES = ['feat', 'fix', 'refactor', 'test', 'docs', 'chore', 'ci'];

/** @type {import('@commitlint/types').Plugin} */
const projectPlugin = {
  rules: {
    'header-format': (parsed) => {
      const matches =
        typeof parsed.type === 'string' &&
        typeof parsed.scope === 'string' &&
        typeof parsed.subject === 'string' &&
        parsed.subject !== '';
      return [
        matches,
        `header must follow the format "${EXPECTED_FORMAT}", for example "feat: [csv-import] 02 add duplicate detection"`,
      ];
    },
    // Overrides the built-in, which reads the whole header and so would miss
    // a full stop in front of the ", RED" suffix.
    'subject-full-stop': (parsed) => [
      !(parsed.subject ?? '').endsWith('.'),
      'the description must not end with a full stop',
    ],
    'red-only-on-test': (parsed) => [
      parsed.red !== 'RED' || parsed.type === 'test',
      'the ", RED" suffix is only allowed on test: commits',
    ],
    'no-at-or-hash': (parsed) => [
      !/[@#]/.test(parsed.raw ?? ''),
      'the message must not contain "@" or "#": GitHub turns them into mentions and links',
    ],
  },
};

export default {
  parserPreset: {
    parserOpts: {
      headerPattern: HEADER_PATTERN,
      headerCorrespondence: ['type', 'scope', 'ticket', 'subject', 'red'],
    },
  },
  plugins: [projectPlugin],
  rules: {
    'header-format': [2, 'always'],
    'type-enum': [2, 'always', TYPES],
    'subject-full-stop': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 50],
    'red-only-on-test': [2, 'always'],
    'no-at-or-hash': [2, 'always'],
    'body-empty': [2, 'always'],
    'footer-empty': [2, 'always'],
  },
};
