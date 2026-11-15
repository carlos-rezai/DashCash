import { describe, expect, it } from 'vitest';
import { readCalendarDate } from './readCalendarDate.ts';

describe('readCalendarDate', () => {
  it.each([
    ['an ordinary date', '2026-11-15', Date.UTC(2026, 10, 15)],
    ['the first day of a year', '2027-01-01', Date.UTC(2027, 0, 1)],
    ['the last day of a year', '2026-12-31', Date.UTC(2026, 11, 31)],
    ['the last day of a 30-day month', '2026-04-30', Date.UTC(2026, 3, 30)],
    [
      'the 29th of February in a leap year',
      '2028-02-29',
      Date.UTC(2028, 1, 29),
    ],
    ['the 29th of February in 2000', '2000-02-29', Date.UTC(2000, 1, 29)],
  ])('reads %s as its UTC midnight in milliseconds', (_name, value, time) => {
    expect(readCalendarDate(value)).toBe(time);
  });

  it.each([
    ['the 29th of February in a common year', '2026-02-29'],
    ['the 29th of February in 2100', '2100-02-29'],
    ['the 30th of February', '2028-02-30'],
    ['the 31st of a 30-day month', '2026-04-31'],
    ['a 32nd day', '2026-01-32'],
    ['a day 00', '2026-01-00'],
    ['a month 00', '2026-00-10'],
    ['a month 13', '2026-13-01'],
  ])('refuses %s', (_name, value) => {
    expect(readCalendarDate(value)).toBeUndefined();
  });

  it.each([
    ['an empty string', ''],
    ['a one-digit month', '2026-1-15'],
    ['a one-digit day', '2026-11-5'],
    ['a two-digit year', '26-11-15'],
    ['a five-digit year', '20266-11-15'],
    ['slashes', '2026/11/15'],
    ['no separators', '20261115'],
    ['a time after the date', '2026-11-15T00:00:00Z'],
    ['a character before the date', 'x2026-11-15'],
    ['a character after the date', '2026-11-15x'],
    ['a space before the date', ' 2026-11-15'],
    ['a line break after the date', '2026-11-15\n'],
    ['letters in place of digits', 'yyyy-mm-dd'],
    ['the date written day first', '15-11-2026'],
  ])('refuses %s', (_name, value) => {
    expect(readCalendarDate(value)).toBeUndefined();
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 20_261_115],
    ['a time in milliseconds', Date.UTC(2026, 10, 15)],
    ['a Date', new Date(Date.UTC(2026, 10, 15))],
    ['an array holding a date', ['2026-11-15']],
    ['an object', { date: '2026-11-15' }],
  ])('refuses %s, which is not a string', (_name, value) => {
    expect(readCalendarDate(value)).toBeUndefined();
  });
});
