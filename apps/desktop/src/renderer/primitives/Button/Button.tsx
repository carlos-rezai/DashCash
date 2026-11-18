import { useLayoutEffect, useRef, type MouseEvent } from 'react';
import { Icon, type IconName } from '../Icon/Icon.tsx';
import { Loader } from '../Loader/Loader.tsx';
import type { LoaderVariant } from '../Loader/Loader.styles.ts';
import {
  Control,
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

// While loading the label changes, but the button keeps the width it had.
function useHeldWidth(loading: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  const width = useRef(0);
  useLayoutEffect(() => {
    const button = ref.current;
    if (button === null) {
      return;
    }
    if (loading) {
      button.style.minWidth = `${String(width.current)}px`;
    } else {
      button.style.minWidth = '';
      width.current = button.getBoundingClientRect().width;
    }
  });
  return ref;
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
  const ref = useHeldWidth(loading);
  const iconSize = ICON_SIZE[size];
  const shownLabel = loading && loadingLabel ? loadingLabel : label;
  const iconOnly = label === undefined || label === '';

  return (
    <Control
      ref={ref}
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
      {iconOnly ? null : <span>{shownLabel}</span>}
      {iconRight === undefined ? null : (
        <Icon glyph={iconRight} size={iconSize} />
      )}
    </Control>
  );
}
