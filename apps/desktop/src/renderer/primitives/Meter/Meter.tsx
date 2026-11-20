import { Bar, Frame, Projection, type MeterTone } from './Meter.styles.ts';

type MeterProps = {
  // The solid bar, from 0 to 1.
  value: number;
  // The dashed outline beyond the value, from 0 to 1.
  projected?: number;
  tone?: MeterTone;
  // In pixels.
  height?: number;
  // The name of a meter no label names.
  ariaLabel?: string;
};

function clamp(share: number | undefined): number {
  return Math.max(0, Math.min(1, share ?? 0));
}

// A bar for a share of a whole, with an optional projection beyond it.
export function Meter({
  value,
  projected,
  tone = 'neutral',
  height = 6,
  ariaLabel,
}: MeterProps) {
  const share = clamp(value);
  const reach = Math.max(share, clamp(projected));
  return (
    <Frame
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(share * 100)}
      $height={height}
    >
      {reach > share ? <Projection $tone={tone} $share={reach} /> : null}
      <Bar $tone={tone} $share={share} />
    </Frame>
  );
}
