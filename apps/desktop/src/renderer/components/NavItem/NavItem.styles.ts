import { styled, type DefaultTheme } from 'styled-components';

export type NavItemBadgeTone = 'accent' | 'warning';

type Look = { fill: string; text: string };

// NavItem.dc.html: the badge's fill and text by tone.
function pickBadgeLook(tone: NavItemBadgeTone, theme: DefaultTheme): Look {
  const { color } = theme;
  return tone === 'warning'
    ? { fill: color.warningTint, text: color.warning }
    : { fill: color.accent[200], text: color.accent[800] };
}

type FrameProps = { $active: boolean; $compact: boolean };

// The item: the full width of the sidebar at 38 px, the icon, the label and
// the badge in a row. The active one is on the accent-100 fill inside the
// accent-300 border; a resting one clears until the pointer reaches it.
export const Frame = styled.button<FrameProps>`
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: ${({ $compact }) => ($compact ? 'center' : 'flex-start')};
  gap: ${({ theme }) => theme.space.navItemGap};
  width: 100%;
  height: ${({ theme }) => theme.size.navItem};
  padding: ${({ $compact, theme }) =>
    $compact ? '0' : `0 ${theme.space.navItemPadding}`};
  line-height: 1;
  background: ${({ $active, theme }) =>
    $active ? theme.color.accent[100] : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.color.text : theme.color.textMuted};
  border: ${({ theme }) => theme.size.hairline} solid
    ${({ $active, theme }) => ($active ? theme.color.accent[300] : 'transparent')};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.fontSize.md};
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.color.accent[100] : theme.color.hover};
    color: ${({ theme }) => theme.color.text};
  }
`;

// The icon follows the text colour, except on the active item.
export const IconBox = styled.span<{ $active: boolean }>`
  display: flex;
  color: ${({ $active, theme }) =>
    $active ? theme.color.accent[600] : 'currentColor'};
`;

export const Label = styled.span`
  flex: 1;
  min-width: 0;
  white-space: nowrap;
`;

type BadgeProps = { $tone: NavItemBadgeTone };

export const Badge = styled.span<BadgeProps>`
  box-sizing: border-box;
  min-width: ${({ theme }) => theme.size.navBadgeMinWidth};
  padding: 0 ${({ theme }) => theme.space.navBadgePadding};
  font-size: ${({ theme }) => theme.fontSize.caption};
  line-height: ${({ theme }) => theme.size.navBadgeLine};
  text-align: center;
  background: ${({ $tone, theme }) => pickBadgeLook($tone, theme).fill};
  color: ${({ $tone, theme }) => pickBadgeLook($tone, theme).text};
  font-variant-numeric: tabular-nums;
`;

// A compact item's count: a chip in the top right corner.
export const Chip = styled.span<BadgeProps>`
  box-sizing: border-box;
  position: absolute;
  top: ${({ theme }) => theme.space.navChipInset};
  right: ${({ theme }) => theme.space.navChipInset};
  min-width: ${({ theme }) => theme.size.navChipMinWidth};
  padding: 0 ${({ theme }) => theme.space.navChipPadding};
  font-size: ${({ theme }) => theme.fontSize.navChip};
  line-height: ${({ theme }) => theme.size.navChipLine};
  text-align: center;
  background: ${({ $tone, theme }) => pickBadgeLook($tone, theme).fill};
  color: ${({ $tone, theme }) => pickBadgeLook($tone, theme).text};
  font-variant-numeric: tabular-nums;
`;
