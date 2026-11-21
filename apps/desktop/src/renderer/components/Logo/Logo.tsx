import { useId } from 'react';
import { Frame, Mark, Wordmark, type LogoTheme } from './Logo.styles.ts';

type LogoProps = {
  variant?: 'full' | 'mark';
  size?: number;
  theme?: LogoTheme;
};

// SPEC, Name and logo: the geometry in the 32 by 32 view box, the circle's
// centre and radius, and the 45 degree line the three dashes lie on.
const CENTRE = 16;
const RADIUS = 13;
const DIAGONAL = 0.70710678;
const UNIT = RADIUS / 9;
const C_PATH = 'M25.2 6.8 A13 13 0 1 0 29 16';
const C_CUT = 'M-2 -2 H34 V34 H-2 Z M16 16 L32.66 16 L23.46 25.2 L16 25.2 Z';
const LINE_PATH = 'M3.3 19 L8.5 16.5 L12.5 19.5 L16 16';
const FIRST_DASHES_PATH = 'M16 16 L22.128 9.872';
const NAME = 'DashCash';

// The optical stroke width by size: 3.2 up to 20 px, 2.6 up to 32, 2.2 above.
export function computeLogoStrokeWidth(size: number): number {
  if (size <= 20) {
    return 3.2;
  }
  return size <= 32 ? 2.6 : 2.2;
}

// Where dash 3 ends: on the 45 degree line, 13 + stroke / 2 from the centre,
// so its tip is flush with the outer edge of the C.
export function computeLogoDashEnd(strokeWidth: number): {
  x: number;
  y: number;
} {
  const reach = DIAGONAL * (RADIUS + strokeWidth / 2);
  return { x: CENTRE + reach, y: CENTRE - reach };
}

function thirdDashPath(strokeWidth: number): string {
  const start = DIAGONAL * 7 * UNIT;
  const end = computeLogoDashEnd(strokeWidth);
  return `M${(CENTRE + start).toFixed(3)} ${(CENTRE - start).toFixed(3)} L${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

// The brand mark, alone or with its wordmark.
export function Logo({
  variant = 'full',
  size = 28,
  theme = 'dark',
}: LogoProps) {
  const cutId = `${useId()}-cut`;
  const strokeWidth = computeLogoStrokeWidth(size);

  return (
    <Frame $theme={theme} $gap={Math.round(size * 0.32)}>
      <Mark
        $theme={theme}
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role="img"
        aria-label={NAME}
      >
        <defs>
          <clipPath id={cutId}>
            <path d={C_CUT} clipRule="evenodd" />
          </clipPath>
        </defs>
        <path
          d={C_PATH}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          clipPath={`url(#${cutId})`}
        />
        <path d={LINE_PATH} strokeWidth={strokeWidth} strokeLinejoin="miter" />
        <path
          d={FIRST_DASHES_PATH}
          strokeWidth={strokeWidth}
          pathLength={6}
          strokeDasharray="2 1"
          strokeDashoffset={2}
        />
        <path d={thirdDashPath(strokeWidth)} strokeWidth={strokeWidth} />
      </Mark>
      {variant === 'mark' ? null : (
        <Wordmark $fontSize={Math.round(size * 0.78)}>{NAME}</Wordmark>
      )}
    </Frame>
  );
}
