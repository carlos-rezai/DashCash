import { styled } from 'styled-components';

// Checkbox.dc.html: a bare button, the box beside its label.
export const Frame = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.checkboxGap};
  padding: 0;
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.fontSize.md};
  cursor: pointer;
  color: ${({ theme }) => theme.color.text};
  background: none;
  border: 0;
`;

// The box: the accent with the ground-coloured check when checked, a neutral
// outline when not.
export const Box = styled.span<{ $checked: boolean }>`
  box-sizing: border-box;
  display: grid;
  flex: none;
  place-items: center;
  width: ${({ theme }) => theme.size.checkbox};
  height: ${({ theme }) => theme.size.checkbox};
  color: ${({ theme }) => theme.color.bg};
  background: ${({ $checked, theme }) =>
    $checked ? theme.color.accent[500] : 'transparent'};
  border: 1px solid
    ${({ $checked, theme }) =>
      $checked ? theme.color.accent[500] : theme.color.neutral[400]};
`;

export const Label = styled.span`
  line-height: 1.3;
`;
