import { css, styled, type DefaultTheme } from 'styled-components';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

type StyledProps = {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $iconOnly: boolean;
  $block: boolean;
  $busy: boolean;
};

function textColour(variant: ButtonVariant, theme: DefaultTheme): string {
  switch (variant) {
    case 'primary':
      return theme.color.bg;
    case 'ghost':
      return theme.color.accent[600];
    case 'danger':
      return theme.color.danger;
    default:
      return theme.color.text;
  }
}

// Primary is the solid accent, the one solid object; the rest are outlines.
const FILLS = {
  primary: css`
    background: ${({ theme }) => theme.color.accent[500]};
    border-color: ${({ theme }) => theme.color.accent[500]};
    &:not(:disabled):hover {
      background: ${({ theme }) => theme.color.accent[600]};
    }
    &:not(:disabled):active {
      background: ${({ theme }) => theme.color.accent[700]};
    }
  `,
  secondary: css`
    border-color: ${({ theme }) => theme.color.divider};
    &:not(:disabled):hover {
      background: ${({ theme }) => theme.color.secondaryHover};
    }
    &:not(:disabled):active {
      background: ${({ theme }) => theme.color.secondaryPressed};
    }
  `,
  ghost: css`
    &:not(:disabled):hover {
      background: ${({ theme }) => theme.color.ghostHover};
    }
    &:not(:disabled):active {
      background: ${({ theme }) => theme.color.ghostPressed};
    }
  `,
};

// The idle and the loading content, one face each, stacked in the button's
// one grid cell: the button is as wide as the wider face, in both states. The
// face not shown is hidden, so it is neither seen, announced nor part of the
// button's name.
export const Face = styled.span<{ $hidden: boolean }>`
  grid-area: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.buttonGap};
  ${({ $hidden }) => $hidden && 'visibility: hidden;'}
`;

// In a hidden face, in place of an icon or the Loader: a box of its size. The
// drawing itself is only in the shown face.
export const Mark = styled.span<{ $size: number }>`
  flex: none;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
`;

// In a hidden face, in place of the text: the same text drawn by the style, so
// it takes its width but is not part of the button's text.
export const Ghost = styled.span`
  &::before {
    content: attr(data-text);
  }
`;

export const Control = styled.button<StyledProps>`
  box-sizing: border-box;
  display: inline-grid;
  flex: none;
  height: ${({ $size, theme }) => theme.size.controlHeight[$size]};
  min-height: ${({ $size, theme }) => theme.size.controlHeight[$size]};
  width: ${({ $block, $iconOnly, $size, theme }) => {
    if ($iconOnly) {
      return theme.size.controlHeight[$size];
    }
    return $block ? '100%' : 'auto';
  }};
  padding: 0
    ${({ $iconOnly, $size, theme }) => {
      if ($iconOnly) {
        return '0';
      }
      return $size === 'sm'
        ? theme.space.buttonPaddingSm
        : theme.space.buttonPaddingMd;
    }};
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  font-size: ${({ $size, theme }) => theme.fontSize[$size]};
  letter-spacing: ${({ theme }) => theme.font.buttonLetterSpacing};
  line-height: 1;
  white-space: nowrap;
  color: ${({ $variant, theme }) => textColour($variant, theme)};
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.size.radius};
  cursor: pointer;
  ${({ $variant }) => FILLS[$variant === 'danger' ? 'secondary' : $variant]}

  /* Disabled: no hover or pressed state; busy: at full strength. */
  &:disabled {
    opacity: ${({ $busy, theme }) => ($busy ? 1 : theme.color.opacity.disabled)};
    cursor: ${({ $busy }) => ($busy ? 'progress' : 'not-allowed')};
  }
`;
