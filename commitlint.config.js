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
    'body-empty': [2, 'always'],
    'footer-empty': [2, 'always'],
  },
};
