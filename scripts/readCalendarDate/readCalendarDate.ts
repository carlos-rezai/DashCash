const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// The time of a `YYYY-MM-DD` string in UTC milliseconds, or undefined when it
// is not a real calendar date.
export function readCalendarDate(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = CALENDAR_DATE.exec(value);
  if (match === null) {
    return undefined;
  }
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const time = Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0);
  return new Date(time).toISOString().startsWith(value) ? time : undefined;
}
