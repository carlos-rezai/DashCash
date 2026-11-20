import { styled } from 'styled-components';

// The dark backdrop over the page, the panel in the middle of it.
export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.color.backdrop};
`;

// The panel: the raised fill inside the soft card border, square, with the
// large shadow; the header and the content one above the other.
export const Panel = styled.div<{ $width: number | undefined }>`
  box-sizing: border-box;
  width: ${({ theme, $width }) =>
    $width === undefined ? theme.size.modalWidth : `${String($width)}px`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.space4};
  padding: ${({ theme }) => theme.space.space6};
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.cardBorder};
  box-shadow: ${({ theme }) => theme.shadow.lg};
`;

// The title and the subtitle on the left, the close button on the right.
export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.space3};
`;

export const Heading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.cardKickerGap};
`;

export const Title = styled.span`
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  font-size: ${({ theme }) => theme.fontSize.lg};
`;

export const Subtitle = styled.span`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.color.textMuted};
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.space4};
  font-size: ${({ theme }) => theme.fontSize.md};
`;
