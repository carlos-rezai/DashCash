import type { Cents } from '@dashcash/domain/money/cents/cents';
import { formatCents } from '@dashcash/domain/money/formatCents/formatCents';
import { Figure, type AmountColour, type AmountSize } from './Amount.styles.ts';

type AmountTone =
  | 'auto'
  | 'muted'
  | 'neutral'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'danger'
  | 'accent';

type AmountProps = {
  cents: Cents | null;
  sign?: 'auto' | 'always' | 'none';
  size?: AmountSize;
  tone?: AmountTone;
  whole?: boolean;
  strong?: boolean;
};

const NO_AMOUNT = '-';

// The Polarity colour: green above zero, red below, ink at zero and for none.
function pickPolarityColour(cents: Cents | null): AmountColour {
  if (cents === null || cents === 0) {
    return 'ink';
  }
  return cents > 0 ? 'positive' : 'negative';
}

function pickToneColour(tone: AmountTone, cents: Cents | null): AmountColour {
  switch (tone) {
    case 'auto':
    case 'muted':
      return pickPolarityColour(cents);
    case 'neutral':
      return 'ink';
    default:
      return tone;
  }
}

export function Amount({
  cents,
  sign = 'auto',
  size = 'md',
  tone = 'auto',
  whole = false,
  strong = false,
}: AmountProps) {
  return (
    <Figure $size={size} $colour={pickToneColour(tone, cents)} $strong={strong}>
      {cents === null ? NO_AMOUNT : formatCents(cents, { whole, sign })}
    </Figure>
  );
}
