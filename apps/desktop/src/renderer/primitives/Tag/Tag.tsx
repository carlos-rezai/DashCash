import { Icon, type IconName } from '../Icon/Icon.tsx';
import { Swatch } from '../Swatch/Swatch.tsx';
import { Frame, type TagTone } from './Tag.styles.ts';

export type { TagTone };

type TagProps = {
  label: string;
  tone?: TagTone;
  icon?: IconName;
  // A colour: drawn as an 8 px square left of the label.
  swatch?: string;
};

const ICON_SIZE = 12;
const SWATCH_SIZE = 8;

export function Tag({ label, tone = 'neutral', icon, swatch }: TagProps) {
  return (
    <Frame $tone={tone}>
      {swatch === undefined ? null : (
        <Swatch color={swatch} size={SWATCH_SIZE} />
      )}
      {icon === undefined ? null : <Icon glyph={icon} size={ICON_SIZE} />}
      <span>{label}</span>
    </Frame>
  );
}
