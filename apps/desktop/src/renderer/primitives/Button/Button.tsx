import type { MouseEvent } from 'react';
import { Icon, type IconName } from '../Icon/Icon.tsx';
import { Loader } from '../Loader/Loader.tsx';
import type { LoaderVariant } from '../Loader/Loader.styles.ts';
import {
  Control,
  Face,
  Ghost,
  Mark,
  type ButtonSize,
  type ButtonVariant,
} from './Button.styles.ts';

type ButtonProps = {
  // Omitted: a square icon button, named by its title.
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
  disabled?: boolean;
  title?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  loading?: boolean;
  // The -ing form of the label, shown while loading.
  loadingLabel?: string;
  loaderVariant?: LoaderVariant;
};

const ICON_SIZE = { sm: 14, md: 16 };

type FaceProps = {
  shown: boolean;
  iconSize: number;
  // What stands left of the text: an icon, the Loader, or nothing.
  lead: IconName | 'loader' | undefined;
  text: string | undefined;
  iconRight: IconName | undefined;
  loaderVariant: LoaderVariant;
};

// One state of the button. Not shown, it keeps the room of its content and
// draws none of it.
function ButtonFace({
  shown,
  iconSize,
  lead,
  text,
  iconRight,
  loaderVariant,
}: FaceProps) {
  const mark = <Mark $size={iconSize} />;
  let leading = null;
  if (lead !== undefined) {
    if (!shown) {
      leading = mark;
    } else if (lead === 'loader') {
      leading = (
        <Loader
          variant={loaderVariant}
          size={iconSize}
          delay={0}
          color="currentColor"
        />
      );
    } else {
      leading = <Icon glyph={lead} size={iconSize} />;
    }
  }
  let trailing = null;
  if (iconRight !== undefined) {
    trailing = shown ? <Icon glyph={iconRight} size={iconSize} /> : mark;
  }
  let words = null;
  if (text !== undefined && text !== '') {
    words = shown ? text : <Ghost data-text={text} />;
  }

  return (
    <Face $hidden={!shown} aria-hidden={shown ? undefined : true}>
      {leading}
      {words}
      {trailing}
    </Face>
  );
}

export function Button({
  label,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  block = false,
  disabled = false,
  title,
  onClick,
  loading = false,
  loadingLabel,
  loaderVariant = 'draw',
}: ButtonProps) {
  const iconSize = ICON_SIZE[size];
  const iconOnly = label === undefined || label === '';
  const common = { iconSize, iconRight, loaderVariant };

  return (
    <Control
      type="button"
      $variant={variant}
      $size={size}
      $iconOnly={iconOnly}
      $block={block}
      $busy={loading}
      disabled={disabled || loading}
      aria-busy={loading}
      title={title === undefined || title === '' ? label : title}
      onClick={onClick}
    >
      <ButtonFace {...common} shown={!loading} lead={icon} text={label} />
      <ButtonFace
        {...common}
        shown={loading}
        lead="loader"
        text={
          loadingLabel === undefined || loadingLabel === ''
            ? label
            : loadingLabel
        }
      />
    </Control>
  );
}
