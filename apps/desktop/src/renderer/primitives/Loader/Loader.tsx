import { useEffect, useId, useState } from 'react';
import { hasText } from '../../utils/hasText/hasText.ts';
import {
  computeLogoStrokeWidth,
  LOGO_C_CUT,
  LOGO_C_PATH,
  LOGO_CENTRE,
  LOGO_DIAGONAL,
  LOGO_LINE_PATH,
  LOGO_RADIUS,
  LOGO_UNIT,
} from '../../utils/logoGeometry/logoGeometry.ts';
import {
  Label,
  Mark,
  Orbit,
  Placeholder,
  Status,
  Stroke,
  type LoaderVariant,
  type StrokeMotion,
} from './Loader.styles.ts';

type LoaderProps = {
  variant?: LoaderVariant;
  size?: number;
  label?: string;
  // Milliseconds before it appears, so quick tasks never flash.
  delay?: number;
  dashesOnly?: boolean;
  color?: string;
};

const LARGE_FROM = 48;
const DASHES_ONLY_UP_TO = 20;
const DASH_ARRAY = '1 1.05';
const SMALL_DASH_WIDTH = 5.2;

// A point on the 45 degree line, t along it from the centre.
function placeOnDiagonal(t: number): string {
  const x = LOGO_CENTRE + LOGO_DIAGONAL * t;
  const y = LOGO_CENTRE - LOGO_DIAGONAL * t;
  return `${x.toFixed(3)} ${y.toFixed(3)}`;
}

function drawSegment(from: number, to: number): string {
  return `M${placeOnDiagonal(from)} L${placeOnDiagonal(to)}`;
}

function buildDashPaths(small: boolean, strokeWidth: number): string[] {
  if (small) {
    return [drawSegment(-13, -5.5), drawSegment(-3, 4.5), drawSegment(7, 14.5)];
  }
  return [
    drawSegment(LOGO_UNIT, 3 * LOGO_UNIT),
    drawSegment(4 * LOGO_UNIT, 6 * LOGO_UNIT),
    drawSegment(7 * LOGO_UNIT, LOGO_RADIUS + strokeWidth / 2),
  ];
}

function pickDashMotion(variant: LoaderVariant, small: boolean): StrokeMotion {
  if (variant === 'draw') {
    return 'drawDash';
  }
  if (variant === 'grow') {
    return 'grow';
  }
  return variant === 'march' || small ? 'march' : 'none';
}

// True once the delay has run out; at once for a delay of 0.
function useAfterDelay(delay: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (delay <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setElapsed(true);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [delay]);
  return delay <= 0 || elapsed;
}

export function Loader({
  variant = 'draw',
  size = 32,
  label,
  delay = 300,
  dashesOnly = false,
  color,
}: LoaderProps) {
  const shown = useAfterDelay(delay);
  const cutId = `${useId()}-cut`;
  const small = size <= DASHES_ONLY_UP_TO || dashesOnly;
  const strokeWidth = computeLogoStrokeWidth(size);
  const large = size >= LARGE_FROM;
  const drawn = variant === 'draw';
  const motion = pickDashMotion(variant, small);
  const shownLabel = hasText(label) ? label : null;

  const arc = (
    <Stroke
      d={LOGO_C_PATH}
      pathLength={1}
      clipPath={`url(#${cutId})`}
      strokeWidth={strokeWidth}
      strokeDasharray={drawn ? DASH_ARRAY : undefined}
      $motion={drawn ? 'drawC' : 'none'}
      $index={0}
    />
  );

  return (
    <Status
      role="status"
      aria-live="polite"
      aria-label={shownLabel ?? 'Loading'}
      $large={large}
      $color={color}
    >
      {shown ? (
        <Mark width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          {small ? null : (
            <>
              <defs>
                <clipPath id={cutId}>
                  <path d={LOGO_C_CUT} clipRule="evenodd" />
                </clipPath>
              </defs>
              {variant === 'orbit' ? <Orbit>{arc}</Orbit> : arc}
              <Stroke
                d={LOGO_LINE_PATH}
                pathLength={1}
                strokeLinejoin="miter"
                strokeWidth={strokeWidth}
                strokeDasharray={drawn ? DASH_ARRAY : undefined}
                $motion={drawn ? 'drawLine' : 'none'}
                $index={0}
              />
            </>
          )}
          {buildDashPaths(small, strokeWidth).map((d, index) => (
            <Stroke
              key={d}
              d={d}
              strokeWidth={small ? SMALL_DASH_WIDTH : strokeWidth}
              $motion={motion}
              $index={index}
            />
          ))}
        </Mark>
      ) : (
        <Placeholder $size={size} />
      )}
      {shownLabel === null ? null : (
        <Label $large={large} $shown={shown}>
          {shownLabel}
        </Label>
      )}
    </Status>
  );
}
