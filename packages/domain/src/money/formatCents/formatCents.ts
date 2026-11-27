import type { Cents } from '../cents/cents.ts';

export type FormatCentsOptions = {
  whole?: boolean;
  sign?: 'auto' | 'always' | 'none';
};

const CENTS_PER_EURO = 100;
const HALF_EURO = 50;
const MINUS = '−';
const NO_BREAK_SPACE = ' ';

const groupEuros = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

export function formatCents(
  cents: Cents,
  { whole = false, sign = 'auto' }: FormatCentsOptions = {},
): string {
  const magnitude = Math.abs(cents);
  const remainder = magnitude % CENTS_PER_EURO;
  const euros = Math.floor(magnitude / CENTS_PER_EURO);

  const figure = whole
    ? groupEuros.format(euros + (remainder >= HALF_EURO ? 1 : 0))
    : `${groupEuros.format(euros)},${String(remainder).padStart(2, '0')}`;

  return `${signOf(cents, sign)}${figure}${NO_BREAK_SPACE}€`;
}

function signOf(cents: Cents, sign: 'auto' | 'always' | 'none'): string {
  if (sign === 'none' || cents === 0) {
    return '';
  }
  if (cents < 0) {
    return MINUS;
  }
  return sign === 'always' ? '+' : '';
}
