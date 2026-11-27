import { styled } from 'styled-components';

export const Frame = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.fieldGap};
  min-width: 0;
`;

export const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSize.caption};
  letter-spacing: ${({ theme }) => theme.font.labelLetterSpacing};
  color: ${({ theme }) => theme.color.textMuted};
`;

// The hint, or the error in its place in the danger colour.
export const Message = styled.span<{ $error: boolean }>`
  font-size: ${({ theme }) => theme.fontSize.caption};
  color: ${({ theme, $error }) =>
    $error ? theme.color.danger : theme.color.textFaint};
  text-wrap: pretty;
`;
