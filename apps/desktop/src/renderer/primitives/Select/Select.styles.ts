import { styled, type DefaultTheme } from 'styled-components';

export type SelectSize = 'sm' | 'md';
export type SelectTone = 'default' | 'warning';

// Select.dc.html: the select and its adornments, laid over one box.
export const Frame = styled.span<{ $width: string }>`
  position: relative;
  display: flex;
  align-items: center;
  width: ${({ $width }) => $width};
`;

type ControlProps = {
  $size: SelectSize;
  $tone: SelectTone;
  $chosen: boolean;
  $swatch: boolean;
};

function pickTextColour(
  { $chosen, $tone }: ControlProps,
  theme: DefaultTheme,
): string {
  if ($chosen) {
    return theme.color.text;
  }
  return $tone === 'warning' ? theme.color.warning : theme.color.textMuted;
}

export const Control = styled.select<ControlProps>`
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  height: ${({ $size, theme }) => theme.size.controlHeight[$size]};
  min-height: ${({ $size, theme }) => theme.size.controlHeight[$size]};
  padding: 0 ${({ theme }) => theme.space.selectPaddingChevron} 0
    ${({ $swatch, theme }) =>
      $swatch ? theme.space.selectPaddingSwatch : theme.space.inputPadding};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ $size, theme }) => theme.fontSize[$size]};
  line-height: 1.2;
  color: ${(props) => pickTextColour(props, props.theme)};
  background: ${({ theme }) => theme.color.inputBg};
  border: ${({ theme }) => theme.size.hairline} solid
    ${({ $tone, theme }) =>
      $tone === 'warning' ? theme.color.warning : theme.color.divider};
  border-radius: ${({ theme }) => theme.size.radius};
  caret-color: ${({ theme }) => theme.color.accent[500]};
  cursor: pointer;

  /* styles.css, .input: the border answers the pointer and the keyboard. The
     warning border is set inline in Select.dc.html, so it stays amber. */
  &:hover {
    ${({ $tone, theme }) =>
      $tone === 'warning' ? '' : `border-color: ${theme.color.inputHover};`}
  }

  &:focus-visible {
    ${({ $tone, theme }) =>
      $tone === 'warning' ? '' : `border-color: ${theme.color.accent[500]};`}
    outline-offset: 0;
  }
`;

// An adornment over the select, centred on its full height, out of the way of
// the pointer.
const Adornment = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
`;

export const SwatchSlot = styled(Adornment)`
  left: ${({ theme }) => theme.space.inputAdornmentInset};
`;

export const ChevronSlot = styled(Adornment)`
  right: ${({ theme }) => theme.space.selectChevronInset};
  color: ${({ theme }) => theme.color.textMuted};
`;
