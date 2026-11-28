import { useId } from 'react';
import {
  LOGO_CENTRE,
  LOGO_C_CUT,
  LOGO_C_PATH,
  LOGO_DIAGONAL,
  LOGO_LINE_PATH,
  LOGO_UNIT,
  computeLogoDashEnd,
  computeLogoStrokeWidth,
} from '../../utils/logoGeometry/logoGeometry.ts';
import { Frame, Mark, Wordmark, type LogoTheme } from './Logo.styles.ts';

type LogoProps = {
  variant?: 'full' | 'mark';
  size?: number;
  theme?: LogoTheme;
};

const FIRST_DASHES_PATH = 'M16 16 L22.128 9.872';
const NAME = 'DashCash';

function thirdDashPath(strokeWidth: number): string {
  const start = LOGO_DIAGONAL * 7 * LOGO_UNIT;
  const end = computeLogoDashEnd(strokeWidth);
  return `M${(LOGO_CENTRE + start).toFixed(3)} ${(LOGO_CENTRE - start).toFixed(3)} L${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
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
        aria-label={NAME}
      >
        <defs>
          <clipPath id={cutId}>
            <path d={LOGO_C_CUT} clipRule="evenodd" />
          </clipPath>
        </defs>
        <path
          d={LOGO_C_PATH}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          clipPath={`url(#${cutId})`}
        />
        <path
          d={LOGO_LINE_PATH}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
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
