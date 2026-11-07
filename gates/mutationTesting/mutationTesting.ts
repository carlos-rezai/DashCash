import { isRecord } from '../../scripts/isRecord/isRecord.ts';

const MIN_BREAK = 1;
const MAX_BREAK = 100;

// True only when thresholds.break is a whole number from 1 to 100: null, a
// missing break, 0, 101, a fraction and a string all fail.
export function hasBreakThreshold(thresholds: unknown): boolean {
  if (!isRecord(thresholds)) return false;
  const value = thresholds['break'];
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_BREAK &&
    value <= MAX_BREAK
  );
}
