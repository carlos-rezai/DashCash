import { styled } from 'styled-components';

export type InputSize = 'sm' | 'md';
export type InputAlign = 'left' | 'right';

// Input.dc.html: the field and its adornments, laid over one box.
export const Frame = styled.span<{ $width: string }>`
  position: relative;
  display: flex;
  align-items: center;
  width: ${({ $width }) => $width};
  color: ${({ theme }) => theme.color.textMuted};
`;

type FieldProps = {
  $size: InputSize;
  $align: InputAlign;
  $icon: boolean;
  $suffix: boolean;
};

export const Field = styled.input<FieldProps>`
  box-sizing: border-box;
  width: 100%;
  height: ${({ $size, theme }) => theme.size.controlHeight[$size]};
  min-height: ${({ $size, theme }) => theme.size.controlHeight[$size]};
  padding: 0
    ${({ $suffix, theme }) =>
      $suffix ? theme.space.inputPaddingSuffix : theme.space.inputPadding}
    0
    ${({ $icon, theme }) =>
      $icon ? theme.space.inputPaddingIcon : theme.space.inputPadding};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ $size, theme }) => theme.fontSize[$size]};
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  text-align: ${({ $align }) => $align};
  color: ${({ theme }) => theme.color.text};
  background: ${({ theme }) => theme.color.bg};
  border: 1px solid ${({ theme }) => theme.color.divider};
  border-radius: 0;
  caret-color: ${({ theme }) => theme.color.accent[500]};

  /* styles.css, .input: the border answers the pointer and the keyboard. */
  &:hover {
    border-color: ${({ theme }) => theme.color.inputHover};
  }

  &:focus-visible {
    border-color: ${({ theme }) => theme.color.accent[500]};
    outline-offset: 0;
  }
`;

// An adornment over the field, centred on its full height, out of the way of
// the pointer.
const Adornment = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  pointer-events: none;
`;

export const IconSlot = styled(Adornment)`
  left: ${({ theme }) => theme.space.inputAdornmentInset};
`;

export const SuffixSlot = styled(Adornment)<{ $size: InputSize }>`
  right: ${({ theme }) => theme.space.inputAdornmentInset};
  font-size: ${({ $size, theme }) => theme.fontSize[$size]};
  line-height: 1;
`;
