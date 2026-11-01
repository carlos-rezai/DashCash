import config from '../../commitlint.config.js';

const { headerPattern, headerCorrespondence } = config.parserPreset.parserOpts;

export type CommitHeader = {
  type: string;
  feature: string;
  ticket: string | undefined;
  description: string;
  red: boolean;
};

// The commitlint config names its fields type, scope, ticket, subject and
// red; the ubiquitous language calls the scope a feature and the subject a
// description.
const FIELD_NAMES: Readonly<Record<string, string>> = {
  scope: 'feature',
  subject: 'description',
};

// The first line of a commit message, trimmed.
export function readCommitHeader(message: string): string {
  return message.trim().split('\n')[0] ?? '';
}

// One header line read by the commitlint config's pattern and field order, or
// undefined when the line is off the pattern. The line is not trimmed.
export function parseCommitHeader(header: string): CommitHeader | undefined {
  const match = headerPattern.exec(header);
  if (match === null) {
    return undefined;
  }
  const fields: Record<string, string | undefined> = {};
  headerCorrespondence.forEach((field, index) => {
    fields[FIELD_NAMES[field] ?? field] = match[index + 1];
  });
  return {
    type: fields['type'] ?? '',
    feature: fields['feature'] ?? '',
    ticket: fields['ticket'],
    description: fields['description'] ?? '',
    red: fields['red'] !== undefined,
  };
}
