import { styled } from 'styled-components';

export type SegmentedSize = 'sm' | 'md';

// styles.css, .seg: the group and its divider border; Segmented.dc.html: its
// height by size.
export const Group = styled.div<{ $size: SegmentedSize }>`
  box-sizing: border-box;
  display: inline-flex;
  flex: none;
  height: ${({ $size, theme }) => theme.size.controlHeight[$size]};
  border: ${({ theme }) => theme.size.hairline} solid
    ${({ theme }) => theme.color.divider};
  border-radius: ${({ theme }) => theme.size.radius};
`;

type OptionProps = { $selected: boolean; $size: SegmentedSize };

// Segmented.dc.html: an option fills the group's height; the selected one is
// on the accent, the others clear until the pointer reaches them. A divider
// stands before every option but the first.
export const Option = styled.button<OptionProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 100%;
  padding: 0 ${({ theme }) => theme.space.segmentedPadding};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ $size, theme }) => theme.fontSize[$size]};
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  color: ${({ $selected, theme }) =>
    $selected ? theme.color.bg : theme.color.text};
  background: ${({ $selected, theme }) =>
    $selected ? theme.color.accent[500] : 'transparent'};
  border: 0;

  & + & {
    border-left: ${({ theme }) => theme.size.hairline} solid
      ${({ theme }) => theme.color.divider};
  }

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected ? theme.color.accent[600] : theme.color.hover};
  }
`;
