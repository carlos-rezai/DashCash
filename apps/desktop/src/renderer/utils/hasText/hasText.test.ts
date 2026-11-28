import { describe, expect, it } from 'vitest';
import * as utils from '../index.ts';
import { hasText } from './hasText.ts';

// hasText: an optional text prop is absent when it is undefined or ''; any
// other string, a single space included, is text.

describe('hasText', () => {
  it.each([
    { case: 'undefined', text: undefined, expected: false },
    { case: 'an empty string', text: '', expected: false },
    { case: 'a word', text: 'Save', expected: true },
    { case: 'a single space', text: ' ', expected: true },
  ])('returns $expected for $case', ({ text, expected }) => {
    expect(hasText(text)).toBe(expected);
  });

  it('narrows the type to string', () => {
    const upperOrNothing = (text: string | undefined): string =>
      hasText(text) ? text.toUpperCase() : '';

    expect(upperOrNothing('Save')).toBe('SAVE');
    expect(upperOrNothing(undefined)).toBe('');
  });

  it('is re-exported by the barrel', () => {
    expect(utils.hasText).toBe(hasText);
  });
});
