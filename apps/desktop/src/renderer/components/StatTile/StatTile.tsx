import type { Cents } from '@dashcash/domain/money/cents/cents';
import { Amount } from '../../primitives/Amount/Amount.tsx';
import {
  Frame,
  Hint,
  Label,
  Value,
  type StatTileTone,
} from './StatTile.styles.ts';

type StatTileProps = {
  label: string;
  // A text value; shown when there are no cents.
  value?: string;
  // A money value, shown as an Amount in the tile's tone.
  cents?: Cents;
  hint?: string;
  tone?: StatTileTone;
};

// One figure with its kicker and an optional hint.
export function StatTile({
  label,
  value,
  cents,
  hint,
  tone = 'default',
}: StatTileProps) {
  return (
    <Frame>
      <Label>{label}</Label>
      {cents === undefined ? (
        value === undefined ? null : (
          <Value $tone={tone}>{value}</Value>
        )
      ) : (
        <Amount
          cents={cents}
          size="lg"
          tone={tone === 'default' ? 'auto' : tone}
        />
      )}
      {hint === undefined ? null : <Hint>{hint}</Hint>}
    </Frame>
  );
}
