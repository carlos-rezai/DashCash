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

export const Control = styled.button<StyledProps>`
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  gap: ${({ theme }) => theme.space.buttonGap};
  height: ${({ $size, theme }) => theme.controlHeight[$size]};
  min-height: ${({ $size, theme }) => theme.controlHeight[$size]};
  width: ${({ $block, $iconOnly, $size, theme }) => {
    if ($iconOnly) {
      return theme.controlHeight[$size];
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
  border-radius: 0;
  cursor: pointer;
  ${({ $variant }) => FILLS[$variant === 'danger' ? 'secondary' : $variant]}

  /* Disabled: no hover or pressed state; busy: at full strength. */
  &:disabled {
    opacity: ${({ $busy, theme }) => ($busy ? 1 : theme.opacity.disabled)};
    cursor: ${({ $busy }) => ($busy ? 'progress' : 'not-allowed')};
  }
`;
