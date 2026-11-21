import { styled, type DefaultTheme } from 'styled-components';

export type Align = 'left' | 'right';
export type Highlight = 'today' | 'payoff';

// YearTable.dc.html: the wrapper scrolls sideways inside the card, reaching
// past it on either side and padded back, so a focus ring is not clipped.
export const Wrapper = styled.div`
  overflow-x: auto;
  min-width: 0;
  margin: 0 calc(-1 * ${({ theme }) => theme.space.yearTableBleed});
  padding: 0 ${({ theme }) => theme.space.yearTableBleed};
`;

// styles.css, .table: the full width, collapsed borders, 14 px. Equal columns
// use the fixed layout and keep the first column and every data column at
// their least width.
export const Table = styled.table<{ $equal: boolean; $columns: number }>`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSize.md};
  table-layout: ${({ $equal }) => ($equal ? 'fixed' : 'auto')};
  min-width: ${({ $equal, $columns, theme }) =>
    $equal
      ? `calc(${theme.size.yearTableFirstColumn} + ${String($columns)} * ${theme.size.yearTableColumnMin})`
      : '0'};
`;

// styles.css, .table th and dashcash-dark.css: small, spaced, upper case,
// never wrapping, at the bottom of the cell.
export const Head = styled.th<{ $align: Align; $width: string | undefined }>`
  width: ${({ $width, theme }) => $width ?? theme.size.yearTableFirstColumn};
  padding: ${({ theme }) => theme.space.space2};
  border-bottom: 1px solid ${({ theme }) => theme.color.divider};
  text-align: ${({ $align }) => $align};
  font-size: ${({ theme }) => theme.fontSize.tableHead};
  letter-spacing: ${({ theme }) => theme.font.tableHeadLetterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textFaint};
  white-space: nowrap;
  vertical-align: bottom;
`;

// A column header's label with its colour dot before it.
export const HeadLabel = styled.span<{ $align: Align }>`
  display: inline-flex;
  align-items: center;
  justify-content: ${({ $align }) =>
    $align === 'right' ? 'flex-end' : 'flex-start'};
  column-gap: ${({ theme }) => theme.space.yearTableDotGap};
`;

// A year row: clickable, with the hover fill under the pointer.
export const YearRow = styled.tr`
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.color.hover};
  }
`;

function ground(theme: DefaultTheme, highlight: Highlight | undefined) {
  switch (highlight) {
    case 'today':
      return theme.color.accent[100];
    case 'payoff':
      return theme.color.milestoneRow;
    default:
      return theme.color.sunken;
  }
}

// A month row: on the sunken ground, today's month on accent-100, the payoff
// month on the milestone row colour (design log Q7).
export const MonthRow = styled.tr<{ $highlight: Highlight | undefined }>`
  background: ${({ $highlight, theme }) => ground(theme, $highlight)};
`;

// styles.css, .table td: padded, with the faint line under it. A month's
// first cell is inset.
export const DataCell = styled.td<{ $align: Align; $inset?: boolean }>`
  padding: ${({ theme }) => theme.space.space2};
  padding-left: ${({ $inset, theme }) =>
    $inset === true ? theme.space.yearTableMonthInset : theme.space.space2};
  border-bottom: 1px solid ${({ theme }) => theme.color.cardBorder};
  text-align: ${({ $align }) => $align};
`;

// A year row's first cell: the chevron, the year and the tag in a row.
export const YearHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.yearTableYearGap};
  white-space: nowrap;
`;

// The chevron's holder, turned a quarter when the year is open.
export const Chevron = styled.span<{ $open: boolean }>`
  display: flex;
  color: ${({ theme }) => theme.color.textMuted};
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  transition: transform ${({ theme }) => theme.motion.accordionTurn} ease;
`;

export const Year = styled.span`
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  font-size: ${({ theme }) => theme.fontSize.yearTableYear};
`;

// A month row's first cell: the month and its tag in a row.
export const MonthHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.yearTableMonthGap};
  white-space: nowrap;
`;

// A future month's label is told apart by its colour alone.
export const Month = styled.span<{ $muted: boolean }>`
  color: ${({ $muted, theme }) =>
    $muted ? theme.color.textMuted : theme.color.text};
`;

// An icon cell: the icon in the cell's colour, or the row's.
export const IconHolder = styled.span<{ $color: string | undefined }>`
  display: inline-flex;
  ${({ $color }) => ($color === undefined ? '' : `color: ${$color};`)}
`;

export const CellText = styled.span`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.color.textMuted};
  white-space: nowrap;
`;
