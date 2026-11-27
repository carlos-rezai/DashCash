import { Icon, type IconName } from '../../primitives/Icon/Icon.tsx';
import {
  Badge,
  Chip,
  Frame,
  IconBox,
  Label,
  type NavItemBadgeTone,
} from './NavItem.styles.ts';

type NavItemProps = {
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: number;
  badgeTone?: NavItemBadgeTone;
  onClick: () => void;
  // Only the icon, with the label as its tooltip and name.
  compact?: boolean;
};

const ICON_SIZE = 18;

// One entry of the sidebar. A count of 0 shows no badge.
export function NavItem({
  icon,
  label,
  active = false,
  badge,
  badgeTone = 'accent',
  onClick,
  compact = false,
}: NavItemProps) {
  const count = badge !== undefined && badge > 0 ? badge : undefined;
  return (
    <Frame
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={
        compact
          ? label + (count === undefined ? '' : `, ${String(count)}`)
          : undefined
      }
      title={compact ? label : undefined}
      $active={active}
      $compact={compact}
    >
      <IconBox $active={active}>
        <Icon glyph={icon} size={ICON_SIZE} />
      </IconBox>
      {compact ? null : <Label>{label}</Label>}
      {count !== undefined && !compact ? (
        <Badge $tone={badgeTone}>{count}</Badge>
      ) : null}
      {count !== undefined && compact ? (
        <Chip $tone={badgeTone}>{count}</Chip>
      ) : null}
    </Frame>
  );
}
