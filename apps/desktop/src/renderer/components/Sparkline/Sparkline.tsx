import type { Cents } from '@dashcash/domain/money/cents/cents';
import { Box, Line, Tick } from './Sparkline.styles.ts';

type SparklineProps = {
  past: readonly Cents[];
  future: readonly Cents[];
  color: string;
  height?: number;
};

type Point = { x: number; y: number };

type SparklinePoints = {
  solid: Point[];
  dashed: Point[];
  todayX: number;
};

// Sparkline.dc.html: the box is 200 wide; the lowest value sits 2 above the
// bottom and the highest 2 below the top.
const WIDTH = 200;
const MARGIN = 2;
const DEFAULT_HEIGHT = 36;
// Where the tick goes when there is nothing to draw: out of the box.
const HIDDEN_TICK_X = -10;

// One decimal, like the prototype's toFixed(1).
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

// The points of the box for a series of Cents: the past, then the future, on
// one line across the width. The dashed line starts at today, the last past
// point; a series without a future has none. A flat series lies on the low
// line.
export function computeSparklinePoints(
  past: readonly Cents[],
  future: readonly Cents[],
  height: number,
): SparklinePoints {
  const all = [...past, ...future];
  if (all.length === 0) {
    return { solid: [], dashed: [], todayX: HIDDEN_TICK_X };
  }
  const min = Math.min(...all);
  const span = Math.max(...all) - min || 1;
  const steps = all.length - 1 || 1;
  const point = (value: number, index: number): Point => ({
    x: round((index / steps) * WIDTH),
    y: round(height - MARGIN - ((value - min) / span) * (height - 2 * MARGIN)),
  });
  const offset = Math.max(0, past.length - 1);
  const lastPast = past.at(-1);
  const dashedValues =
    future.length === 0
      ? []
      : lastPast === undefined
        ? [...future]
        : [lastPast, ...future];
  return {
    solid: past.map((value, index) => point(value, index)),
    dashed: dashedValues.map((value, index) => point(value, index + offset)),
    todayX: round((offset / steps) * WIDTH),
  };
}

function toPath(points: readonly Point[]): string {
  return points.length === 0
    ? ''
    : `M${points.map(({ x, y }) => `${String(x)},${String(y)}`).join(' L')}`;
}

// A series drawn small: the past solid, the future dashed, a hairline tick at
// today.
export function Sparkline({
  past,
  future,
  color,
  height = DEFAULT_HEIGHT,
}: SparklineProps) {
  const points = computeSparklinePoints(past, future, height);

  return (
    <Box
      height={height}
      viewBox={`0 0 ${String(WIDTH)} ${String(height)}`}
      preserveAspectRatio="none"
    >
      <Line d={toPath(points.solid)} $color={color} $future={false} />
      {points.dashed.length === 0 ? null : (
        <Line d={toPath(points.dashed)} $color={color} $future />
      )}
      <Tick x1={points.todayX} x2={points.todayX} y1={0} y2={height} />
    </Box>
  );
}
