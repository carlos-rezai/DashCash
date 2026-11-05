import { describe, expect, it } from 'vitest';
import { isRecord } from './isRecord.ts';

describe('isRecord', () => {
  it.each([
    ['an empty object', {}],
    ['an object with keys', { a: 1 }],
    ['an object without a prototype', Object.create(null)],
  ])('is true for %s', (_name, value) => {
    expect(isRecord(value)).toBe(true);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an array', [1, 2]],
    ['an empty array', []],
    ['a string', 'text'],
    ['a number', 42],
    ['a function', () => 1],
  ])('is false for %s', (_name, value) => {
    expect(isRecord(value)).toBe(false);
  });
});
