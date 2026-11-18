import type { MouseEvent } from 'react';
import { Icon, type IconName } from '../Icon/Icon.tsx';
import { Loader } from '../Loader/Loader.tsx';
import type { LoaderVariant } from '../Loader/Loader.styles.ts';
import {
  Control,
  Label,
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
  const shownLabel = loading && loadingLabel ? loadingLabel : label;
  // The text the button shows in its other state, which it keeps room for.
  const heldLabel = loading && loadingLabel ? label : loadingLabel;
  const iconOnly = label === undefined || label === '';

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
      title={title ?? label}
      onClick={onClick}
    >
      {loading ? (
        <Loader
          variant={loaderVariant}
          size={iconSize}
          delay={0}
          color="currentColor"
        />
      ) : null}
      {icon !== undefined && !loading ? (
        <Icon glyph={icon} size={iconSize} />
      ) : null}
      {iconOnly ? null : <Label data-hold={heldLabel}>{shownLabel}</Label>}
      {iconRight === undefined ? null : (
        <Icon glyph={iconRight} size={iconSize} />
      )}
    </Control>
  );
}
