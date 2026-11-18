import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as centsByPath from '@dashcash/domain/money/cents/cents';
import { toCents } from './cents.ts';

// Cents (design log Q16, Q17): money as a whole number of euro cents, the
// branded type every money value carries; toCents makes one from a safe
// integer and refuses everything else.

describe('toCents', () => {
  it.each([
    { case: 'zero', value: 0 },
    { case: 'one cent', value: 1 },
    { case: 'a positive amount', value: 123_456 },
    { case: 'minus one cent', value: -1 },
    { case: 'a negative amount', value: -8_640 },
    { case: 'the largest safe integer', value: Number.MAX_SAFE_INTEGER },
    { case: 'the smallest safe integer', value: Number.MIN_SAFE_INTEGER },
  ])('returns $case unchanged', ({ value }) => {
    expect(toCents(value)).toBe(value);
  });

  it.each([
    { case: 'a half cent', value: 0.5 },
    { case: 'a negative fraction', value: -1.5 },
    { case: 'euros with cents as a fraction', value: 12.34 },
    { case: 'a fraction just above an integer', value: 1 + Number.EPSILON },
    { case: 'NaN', value: Number.NaN },
    { case: 'positive infinity', value: Number.POSITIVE_INFINITY },
    { case: 'negative infinity', value: Number.NEGATIVE_INFINITY },
    {
      case: 'the integer above the largest safe integer',
      value: Number.MAX_SAFE_INTEGER + 1,
    },
    {
      case: 'the integer below the smallest safe integer',
      value: Number.MIN_SAFE_INTEGER - 1,
    },
    { case: 'a large unsafe integer', value: 2 ** 60 },
  ])('throws a RangeError naming $case', ({ value }) => {
    expect(() => toCents(value)).toThrow(RangeError);
    expect(() => toCents(value)).toThrow(String(value));
  });
});

describe('the @dashcash/domain package', () => {
  it('resolves the cents module by its path', () => {
    expect(centsByPath.toCents).toBe(toCents);
  });

  it('is private, an ES module package at 0.0.0 that exports each module by its path', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
    ) as Record<string, unknown>;

    expect(manifest).toMatchObject({
      name: '@dashcash/domain',
      private: true,
      version: '0.0.0',
      type: 'module',
    });
    expect(manifest['exports']).toEqual({ './*': './src/*.ts' });
  });
});
