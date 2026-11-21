import { styled } from 'styled-components';

// The page's top: the title column on the left, the actions at the right and
// level with the column's bottom; they wrap below it when they do not fit.
export const Frame = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.space4};
  flex-wrap: wrap;
`;

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.headerGap};
  min-width: 0;
`;

// A bare button: the accent text and the arrow, as wide as its content.
export const Back = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.headerGap};
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: ${({ theme }) => theme.color.accent[600]};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.fontSize.sm};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.accent[700]};
  }
`;

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.space3};
`;

export const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSize.xl};
  letter-spacing: ${({ theme }) => theme.font.headingLetterSpacing};
`;

export const Subtitle = styled.span`
  font-size: ${({ theme }) => theme.fontSize.md};
  color: ${({ theme }) => theme.color.textMuted};
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.space2};
`;
