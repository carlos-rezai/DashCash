const MS_PER_DAY = 86_400_000;

export type EntryDateProblem = { field: 'added' | 'expires'; why: string };

// The Entry date rules of one entry whose dates are already read: added is not
// later than today, and expires is not before added nor more than `maxDays`
// days after it. Added is named before expires.
export function findEntryDateProblems(
  dates: { added: number; expires: number },
  today: number,
  maxDays: number,
): EntryDateProblem[] {
  const { added, expires } = dates;
  const problems: EntryDateProblem[] = [];
  if (added > today) {
    problems.push({ field: 'added', why: 'is later than today' });
  }
  if (expires < added) {
    problems.push({ field: 'expires', why: 'is before added' });
  } else if (expires - added > maxDays * MS_PER_DAY) {
    problems.push({
      field: 'expires',
      why: `is more than ${String(maxDays)} days after added`,
    });
  }
  return problems;
}
