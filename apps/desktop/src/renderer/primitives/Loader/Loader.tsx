import { useEffect, useId, useState } from 'react';
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

// Logo geometry of Loader.dc.html, in its 32 by 32 view box.
const CENTRE = 16;
const DIAGONAL = 0.70710678;
const UNIT = 13 / 9;
const LARGE_FROM = 48;
const DASHES_ONLY_UP_TO = 20;
const C_PATH = 'M25.2 6.8 A13 13 0 1 0 29 16';
const C_CUT = 'M-2 -2 H34 V34 H-2 Z M16 16 L32.66 16 L23.46 25.2 L16 25.2 Z';
const LINE_PATH = 'M3.3 19 L8.5 16.5 L12.5 19.5 L16 16';
const DASH_ARRAY = '1 1.05';
const SMALL_DASH_WIDTH = 5.2;

// A point on the 45 degree line, t along it from the centre.
function onDiagonal(t: number): string {
  const x = CENTRE + DIAGONAL * t;
  const y = CENTRE - DIAGONAL * t;
  return `${x.toFixed(3)} ${y.toFixed(3)}`;
}

function segment(from: number, to: number): string {
  return `M${onDiagonal(from)} L${onDiagonal(to)}`;
}

function strokeWidthFor(size: number): number {
  if (size <= DASHES_ONLY_UP_TO) {
    return 3.2;
  }
  return size <= 32 ? 2.6 : 2.2;
}

function dashPaths(small: boolean, strokeWidth: number): string[] {
  if (small) {
    return [segment(-13, -5.5), segment(-3, 4.5), segment(7, 14.5)];
  }
  return [
    segment(UNIT, 3 * UNIT),
    segment(4 * UNIT, 6 * UNIT),
    segment(7 * UNIT, 13 + strokeWidth / 2),
  ];
}

function dashMotion(variant: LoaderVariant, small: boolean): StrokeMotion {
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
  const strokeWidth = strokeWidthFor(size);
  const large = size >= LARGE_FROM;
  const drawn = variant === 'draw';
  const motion = dashMotion(variant, small);
  const shownLabel = label === undefined || label === '' ? null : label;

  const arc = (
    <Stroke
      d={C_PATH}
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
                  <path d={C_CUT} clipRule="evenodd" />
                </clipPath>
              </defs>
              {variant === 'orbit' ? <Orbit>{arc}</Orbit> : arc}
              <Stroke
                d={LINE_PATH}
                pathLength={1}
                strokeLinejoin="miter"
                strokeWidth={strokeWidth}
                strokeDasharray={drawn ? DASH_ARRAY : undefined}
                $motion={drawn ? 'drawLine' : 'none'}
                $index={0}
              />
            </>
          )}
          {dashPaths(small, strokeWidth).map((d, index) => (
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
