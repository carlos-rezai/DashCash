import { describe, expect, it } from 'vitest';
import * as formatCentsByPath from '@dashcash/domain/money/formatCents/formatCents';
import { toCents } from '../cents/cents.ts';
import { formatCents } from './formatCents.ts';

// The Money format (design log Q18): German grouping and decimals as
// Intl.NumberFormat('de-DE') gives them, a no-break space before the euro
// sign, U+2212 for minus, the sign taken from the cents.

const NBSP = ' ';
const MINUS = '−';

describe('formatCents', () => {
  describe('groups thousands with a dot and shows exactly two decimals after a comma', () => {
    it.each([
      { cents: 1, expected: `0,01${NBSP}€` },
      { cents: 5, expected: `0,05${NBSP}€` },
      { cents: 10, expected: `0,10${NBSP}€` },
      { cents: 99, expected: `0,99${NBSP}€` },
      { cents: 100, expected: `1,00${NBSP}€` },
      { cents: 99_999, expected: `999,99${NBSP}€` },
      { cents: 100_000, expected: `1.000,00${NBSP}€` },
      { cents: 123_456, expected: `1.234,56${NBSP}€` },
      { cents: 3_000_000, expected: `30.000,00${NBSP}€` },
      { cents: 123_456_789, expected: `1.234.567,89${NBSP}€` },
    ])('formats $cents cents as $expected', ({ cents, expected }) => {
      expect(formatCents(toCents(cents))).toBe(expected);
    });
  });

  describe('with whole, rounds to whole euros without decimals', () => {
    it.each([
      { cents: 3_000_000, expected: `30.000${NBSP}€` },
      { cents: 123_456, expected: `1.235${NBSP}€` },
      { cents: 123_449, expected: `1.234${NBSP}€` },
      { cents: 100, expected: `1${NBSP}€` },
      { cents: 99, expected: `1${NBSP}€` },
      { cents: 49, expected: `0${NBSP}€` },
      { cents: 150, expected: `2${NBSP}€` },
      { cents: 250, expected: `3${NBSP}€` },
      { cents: -250, expected: `${MINUS}3${NBSP}€` },
      { cents: -8_640, expected: `${MINUS}86${NBSP}€` },
      { cents: 123_456_789, expected: `1.234.568${NBSP}€` },
    ])('formats $cents cents as $expected', ({ cents, expected }) => {
      expect(formatCents(toCents(cents), { whole: true })).toBe(expected);
    });

    it('shows two decimals when whole is false', () => {
      expect(formatCents(toCents(123_456), { whole: false })).toBe(
        `1.234,56${NBSP}€`,
      );
    });
  });

  describe('puts a no-break space, U+00A0, before the euro sign', () => {
    it.each([
      { case: '12,50 €', cents: 1_250, options: {} },
      { case: '−86,40 €', cents: -8_640, options: {} },
      { case: '30.000 € whole', cents: 3_000_000, options: { whole: true } },
      { case: '+12,50 € always', cents: 1_250, options: { sign: 'always' } },
      { case: '0,00 €', cents: 0, options: {} },
    ] as const)('in $case', ({ cents, options }) => {
      const formatted = formatCents(toCents(cents), options);

      expect(formatted).toMatch(new RegExp(`\\d${NBSP}€$`));
      expect(formatted).not.toContain(' ');
    });
  });

  describe('starts a negative amount with U+2212, never a hyphen', () => {
    it.each([
      { cents: -1, expected: `${MINUS}0,01${NBSP}€` },
      { cents: -8_640, expected: `${MINUS}86,40${NBSP}€` },
      { cents: -123_456, expected: `${MINUS}1.234,56${NBSP}€` },
    ])('formats $cents cents as $expected', ({ cents, expected }) => {
      const formatted = formatCents(toCents(cents));

      expect(formatted).toBe(expected);
      expect(formatted).not.toContain('-');
    });

    it.each([
      { cents: -8_640, sign: 'auto', expected: `${MINUS}86,40${NBSP}€` },
      { cents: 1_250, sign: 'auto', expected: `12,50${NBSP}€` },
    ] as const)(
      'formats $cents cents with sign $sign as $expected',
      ({ cents, sign, expected }) => {
        expect(formatCents(toCents(cents), { sign })).toBe(expected);
      },
    );
  });

  describe('with sign always, puts a plus before a positive amount', () => {
    it.each([
      { cents: 1, whole: false, expected: `+0,01${NBSP}€` },
      { cents: 1_250, whole: false, expected: `+12,50${NBSP}€` },
      { cents: 123_456, whole: false, expected: `+1.234,56${NBSP}€` },
      { cents: 3_000_000, whole: true, expected: `+30.000${NBSP}€` },
      { cents: -8_640, whole: false, expected: `${MINUS}86,40${NBSP}€` },
      { cents: -8_640, whole: true, expected: `${MINUS}86${NBSP}€` },
    ])(
      'formats $cents cents, whole $whole, as $expected',
      ({ cents, whole, expected }) => {
        expect(formatCents(toCents(cents), { whole, sign: 'always' })).toBe(
          expected,
        );
      },
    );
  });

  describe('with sign none, shows no sign at all', () => {
    it.each([
      { cents: -8_640, whole: false, expected: `86,40${NBSP}€` },
      { cents: -123_456, whole: false, expected: `1.234,56${NBSP}€` },
      { cents: 1_250, whole: false, expected: `12,50${NBSP}€` },
      { cents: -4_000, whole: true, expected: `40${NBSP}€` },
      { cents: 3_000_000, whole: true, expected: `30.000${NBSP}€` },
    ])(
      'formats $cents cents, whole $whole, as $expected',
      ({ cents, whole, expected }) => {
        expect(formatCents(toCents(cents), { whole, sign: 'none' })).toBe(
          expected,
        );
      },
    );
  });

  describe('shows zero without a sign', () => {
    it.each([
      { sign: undefined, whole: false, expected: `0,00${NBSP}€` },
      { sign: 'auto', whole: false, expected: `0,00${NBSP}€` },
      { sign: 'always', whole: false, expected: `0,00${NBSP}€` },
      { sign: 'none', whole: false, expected: `0,00${NBSP}€` },
      { sign: undefined, whole: true, expected: `0${NBSP}€` },
      { sign: 'always', whole: true, expected: `0${NBSP}€` },
    ] as const)(
      'formats 0 cents with sign $sign, whole $whole, as $expected',
      ({ sign, whole, expected }) => {
        expect(formatCents(toCents(0), { whole, sign })).toBe(expected);
      },
    );
  });

  describe('takes the sign from the cents, not from the rounded figure', () => {
    it.each([
      { cents: -40, sign: 'auto', expected: `${MINUS}0${NBSP}€` },
      { cents: -1, sign: 'auto', expected: `${MINUS}0${NBSP}€` },
      { cents: -49, sign: 'auto', expected: `${MINUS}0${NBSP}€` },
      { cents: -40, sign: 'always', expected: `${MINUS}0${NBSP}€` },
      { cents: 40, sign: 'always', expected: `+0${NBSP}€` },
      { cents: 40, sign: 'auto', expected: `0${NBSP}€` },
      { cents: -40, sign: 'none', expected: `0${NBSP}€` },
    ] as const)(
      'formats $cents cents whole with sign $sign as $expected',
      ({ cents, sign, expected }) => {
        expect(formatCents(toCents(cents), { whole: true, sign })).toBe(
          expected,
        );
      },
    );
  });
});

describe('the @dashcash/domain package', () => {
  it('resolves the formatCents module by its path', () => {
    expect(formatCentsByPath.formatCents).toBe(formatCents);
  });
});
