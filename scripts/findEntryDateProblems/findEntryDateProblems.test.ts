import { describe, expect, it } from 'vitest';
import { findEntryDateProblems } from './findEntryDateProblems.ts';

const MS_PER_DAY = 86_400_000;
const TODAY = Date.UTC(2026, 10, 16);

function daysAfter(time: number, days: number): number {
  return time + days * MS_PER_DAY;
}

describe('findEntryDateProblems', () => {
  describe('added is later than today', () => {
    it.each([
      ['added well before today', daysAfter(TODAY, -10)],
      ['added the day before today', daysAfter(TODAY, -1)],
      ['added today', TODAY],
    ])('finds nothing for %s', (_name, added) => {
      expect(
        findEntryDateProblems({ added, expires: added }, TODAY, 30),
      ).toEqual([]);
    });

    it.each([
      ['added the day after today', daysAfter(TODAY, 1)],
      ['added well after today', daysAfter(TODAY, 20)],
    ])('names added for %s', (_name, added) => {
      expect(
        findEntryDateProblems({ added, expires: added }, TODAY, 30),
      ).toEqual([{ field: 'added', why: 'is later than today' }]);
    });
  });

  describe('expires is before added', () => {
    const added = daysAfter(TODAY, -5);

    it.each([30, 90])(
      'finds nothing when expires is the added day, with a limit of %i days',
      (maxDays) => {
        expect(
          findEntryDateProblems({ added, expires: added }, TODAY, maxDays),
        ).toEqual([]);
      },
    );

    it.each([
      ['the day before added', 30, daysAfter(added, -1)],
      ['the day before added', 90, daysAfter(added, -1)],
      ['well before added', 30, daysAfter(added, -200)],
      ['well before added', 90, daysAfter(added, -200)],
    ])(
      'names expires for an expiry %s, with a limit of %i days',
      (_name, maxDays, expires) => {
        expect(
          findEntryDateProblems({ added, expires }, TODAY, maxDays),
        ).toEqual([{ field: 'expires', why: 'is before added' }]);
      },
    );
  });

  describe('expires is more than the limit after added', () => {
    const added = daysAfter(TODAY, -5);

    it.each([
      [30, 1],
      [30, 29],
      [30, 30],
      [90, 1],
      [90, 89],
      [90, 90],
    ])(
      'finds nothing with a limit of %i days for an expiry %i days after added',
      (maxDays, days) => {
        expect(
          findEntryDateProblems(
            { added, expires: daysAfter(added, days) },
            TODAY,
            maxDays,
          ),
        ).toEqual([]);
      },
    );

    it.each([
      [30, 31],
      [30, 90],
      [90, 91],
      [90, 365],
    ])(
      'names expires with a limit of %i days for an expiry %i days after added',
      (maxDays, days) => {
        expect(
          findEntryDateProblems(
            { added, expires: daysAfter(added, days) },
            TODAY,
            maxDays,
          ),
        ).toEqual([
          {
            field: 'expires',
            why: `is more than ${String(maxDays)} days after added`,
          },
        ]);
      },
    );
  });

  describe('more than one problem', () => {
    it.each([30, 90])(
      'names added before expires, with a limit of %i days',
      (maxDays) => {
        const added = daysAfter(TODAY, 3);
        expect(
          findEntryDateProblems(
            { added, expires: daysAfter(added, maxDays + 1) },
            TODAY,
            maxDays,
          ),
        ).toEqual([
          { field: 'added', why: 'is later than today' },
          {
            field: 'expires',
            why: `is more than ${String(maxDays)} days after added`,
          },
        ]);
      },
    );

    it('names added before an expiry before added', () => {
      const added = daysAfter(TODAY, 3);
      expect(
        findEntryDateProblems(
          { added, expires: daysAfter(added, -1) },
          TODAY,
          90,
        ),
      ).toEqual([
        { field: 'added', why: 'is later than today' },
        { field: 'expires', why: 'is before added' },
      ]);
    });
  });
});
