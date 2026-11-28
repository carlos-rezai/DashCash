import {
  css,
  keyframes,
  styled,
  type DefaultTheme,
  type RuleSet,
} from 'styled-components';
import { LOGO_CENTRE } from '../../utils/logoGeometry/logoGeometry.ts';

export type LoaderVariant = 'draw' | 'march' | 'orbit' | 'grow';

// The keyframes of docs/design/assets/loaders/loader-keyframes.css.
const drawC = keyframes`
  0%, 47.9% { stroke-dashoffset: 1; opacity: 0; }
  48% { stroke-dashoffset: 1; opacity: 1; }
  78% { stroke-dashoffset: 0; opacity: 1; }
  86% { stroke-dashoffset: 0; opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
`;
const drawLine = keyframes`
  0% { stroke-dashoffset: 1; opacity: 1; }
  24% { stroke-dashoffset: 0; }
  86% { stroke-dashoffset: 0; opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
`;
const drawDash1 = keyframes`
  0%, 24% { opacity: 0; }
  30% { opacity: 1; }
  86% { opacity: 1; }
  100% { opacity: 0; }
`;
const drawDash2 = keyframes`
  0%, 32% { opacity: 0; }
  38% { opacity: 1; }
  86% { opacity: 1; }
  100% { opacity: 0; }
`;
const drawDash3 = keyframes`
  0%, 40% { opacity: 0; }
  46% { opacity: 1; }
  86% { opacity: 1; }
  100% { opacity: 0; }
`;
// The keyframes whose opacities are Theme tokens are built from the Theme.
const march = (theme: DefaultTheme) => keyframes`
  0% { opacity: ${theme.color.opacity.loaderMarch}; }
  25% { opacity: 1; }
  55%, 100% { opacity: ${theme.color.opacity.loaderMarch}; }
`;
const spin = keyframes`
  to { transform: rotate(360deg); }
`;
const grow1 = (theme: DefaultTheme) => keyframes`
  0%, 12% { opacity: ${theme.color.opacity.loaderGrow}; }
  20% { opacity: 1; }
  86% { opacity: 1; }
  100% { opacity: ${theme.color.opacity.loaderGrow}; }
`;
const grow2 = (theme: DefaultTheme) => keyframes`
  0%, 34% { opacity: ${theme.color.opacity.loaderGrow}; }
  42% { opacity: 1; }
  86% { opacity: 1; }
  100% { opacity: ${theme.color.opacity.loaderGrow}; }
`;
const grow3 = (theme: DefaultTheme) => keyframes`
  0%, 56% { opacity: ${theme.color.opacity.loaderGrow}; }
  64% { opacity: 1; }
  86% { opacity: 1; }
  100% { opacity: ${theme.color.opacity.loaderGrow}; }
`;
const breathe = (theme: DefaultTheme) => keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: ${theme.color.opacity.loaderBreathe}; }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export type StrokeMotion =
  'drawC' | 'drawLine' | 'drawDash' | 'march' | 'grow' | 'none';

const DRAW_DASH = [drawDash1, drawDash2, drawDash3];
const GROW: ((theme: DefaultTheme) => ReturnType<typeof keyframes>)[] = [
  grow1,
  grow2,
  grow3,
];

// One loop of a motion, in the Theme's duration.
function loop(
  name: ReturnType<typeof keyframes>,
  theme: DefaultTheme,
  extra = '',
): RuleSet {
  return css`
    animation: ${name} ${theme.motion.loaderLoop} ${extra || 'ease-in-out'}
      infinite;
  `;
}

type StrokeProps = {
  $motion: StrokeMotion;
  // Which of the three dashes: 0, 1 or 2.
  $index: number;
};

function motionOf({ $motion, $index }: StrokeProps, theme: DefaultTheme) {
  switch ($motion) {
    case 'drawC':
      return loop(drawC, theme);
    case 'drawLine':
      return loop(drawLine, theme);
    case 'drawDash':
      return loop(DRAW_DASH[$index] ?? drawDash1, theme);
    case 'grow':
      return loop((GROW[$index] ?? grow1)(theme), theme);
    case 'march':
      // The dashes pulse in turn, 1/6 loop apart.
      return css`
        ${loop(march(theme), theme)}
        animation-delay: calc(${theme.motion.loaderLoop} * ${$index} / 6);
      `;
    default:
      return css``;
  }
}

// Under reduced motion every stroke stands still, in full.
const stillStroke = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    stroke-dashoffset: 0;
    opacity: 1;
    transform: none;
  }
`;

export const Stroke = styled.path<StrokeProps>`
  fill: none;
  stroke: currentColor;
  ${(props) => motionOf(props, props.theme)}
  ${stillStroke}
`;

export const Orbit = styled.g`
  transform-origin: ${LOGO_CENTRE}px ${LOGO_CENTRE}px;
  transform-box: view-box;
  ${({ theme }) => loop(spin, theme, 'linear')}
  ${stillStroke}
`;

export const Mark = styled.svg`
  display: block;
  flex: none;
  overflow: visible;
  animation: ${fadeIn} ${({ theme }) => theme.motion.loaderFadeIn} ease-out;

  @media (prefers-reduced-motion: reduce) {
    ${({ theme }) => css`
      animation: ${breathe(theme)} ${theme.motion.loaderBreathe} ease-in-out
        infinite;
    `}
  }
`;

export const Placeholder = styled.span<{ $size: number }>`
  display: block;
  flex: none;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
`;

type StatusProps = {
  $large: boolean;
  $color: string | undefined;
};

export const Status = styled.span<StatusProps>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $large, theme }) =>
    $large ? theme.space.loaderGapLarge : theme.space.loaderGap};
  color: ${({ $color, theme }) => $color ?? theme.color.accent[600]};
  vertical-align: middle;
  line-height: 1;
`;

export const Label = styled.span<{ $large: boolean; $shown: boolean }>`
  font-size: ${({ $large, theme }) =>
    $large ? theme.fontSize.loaderLabelLarge : theme.fontSize.sm};
  color: ${({ theme }) => theme.color.textMuted};
  opacity: ${({ $shown }) => ($shown ? 1 : 0)};
`;
