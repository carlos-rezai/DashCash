import { describe, expect, it } from 'vitest';
import { parseCommitHeader, readCommitHeader } from './parseCommitHeader.ts';

describe('readCommitHeader', () => {
  it('cuts the first line of a message with a body', () => {
    expect(
      readCommitHeader('feat: [sample] 01 add thing\n\nA body paragraph.\n'),
    ).toBe('feat: [sample] 01 add thing');
  });

  it('trims the message first', () => {
    expect(readCommitHeader('\n  docs: [sample] add prd  \n')).toBe(
      'docs: [sample] add prd',
    );
  });

  it('gives an empty header for an empty message', () => {
    expect(readCommitHeader('')).toBe('');
  });
});

describe('parseCommitHeader', () => {
  it('reads a Planning commit header without a ticket', () => {
    expect(parseCommitHeader('docs: [sample] add prd')).toEqual({
      type: 'docs',
      feature: 'sample',
      ticket: undefined,
      description: 'add prd',
      red: false,
    });
  });

  it('reads a Ticket commit header', () => {
    expect(
      parseCommitHeader('feat: [sample] 02 add duplicate detection'),
    ).toEqual({
      type: 'feat',
      feature: 'sample',
      ticket: '02',
      description: 'add duplicate detection',
      red: false,
    });
  });

  it('reads the RED suffix apart from the description', () => {
    expect(
      parseCommitHeader('test: [sample] 02 add duplicate detection, RED'),
    ).toEqual({
      type: 'test',
      feature: 'sample',
      ticket: '02',
      description: 'add duplicate detection',
      red: true,
    });
  });

  it('gives undefined for a header off the pattern', () => {
    expect(parseCommitHeader('add duplicate detection')).toBeUndefined();
  });

  it('reads only the line it is given, without trimming', () => {
    expect(parseCommitHeader(' feat: [sample] 01 add thing')).toBeUndefined();
  });
});
