import { styled } from 'styled-components';

// Accordion.dc.html: the section with its line under it.
export const Section = styled.section`
  border-bottom: 1px solid ${({ theme }) => theme.color.divider};
`;

// The header: a full-width button that shows the hover fill under the pointer.
export const Header = styled.button`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.accordionGap};
  width: 100%;
  padding: ${({ theme }) => theme.space.accordionPaddingY}
    ${({ theme }) => theme.space.accordionPaddingX};
  background: none;
  border: 0;
  color: ${({ theme }) => theme.color.text};
  font: inherit;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.color.hover};
  }
`;

// The chevron's holder, turned a quarter when the accordion is open.
export const Chevron = styled.span<{ $open: boolean }>`
  display: flex;
  color: ${({ theme }) => theme.color.textMuted};
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  transition: transform ${({ theme }) => theme.motion.accordionTurn} ease;
`;

export const Title = styled.span`
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  font-size: ${({ theme }) => theme.fontSize.accordionTitle};
`;

export const Meta = styled.span`
  margin-left: auto;
  font-size: ${({ theme }) => theme.fontSize.md};
  color: ${({ theme }) => theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`;

export const Content = styled.div`
  padding: 0 0 ${({ theme }) => theme.space.space4}
    ${({ theme }) => theme.space.accordionInset};
`;
