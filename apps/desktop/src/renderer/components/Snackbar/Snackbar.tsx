import { Button } from '../../primitives/Button/Button.tsx';
import { Icon, type IconName } from '../../primitives/Icon/Icon.tsx';
import { Loader } from '../../primitives/Loader/Loader.tsx';
import { hasText } from '../../utils/hasText/hasText.ts';
import {
  Actions,
  Close,
  Frame,
  Lead,
  Message,
  Text,
  Title,
  type SnackbarTone,
} from './Snackbar.styles.ts';

type SnackbarProps = {
  tone: SnackbarTone;
  title: string;
  message?: string;
  // Defaults to the tone's own icon.
  icon?: IconName;
  actionLabel?: string;
  actionIcon?: IconName;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose?: () => void;
  // An 18 px Loader replaces the icon.
  loading?: boolean;
};

const ICON_SIZE = 18;

const TONE_ICONS: Record<SnackbarTone, IconName> = {
  success: 'circleCheck',
  error: 'circleX',
  info: 'info',
  warning: 'alert',
};

// A message that tells the user something happened or needs doing, with up to
// two actions and a close button. Error and warning are alerts, the others
// status messages.
export function Snackbar({
  tone,
  title,
  message,
  icon,
  actionLabel,
  actionIcon,
  onAction,
  secondaryLabel,
  onSecondary,
  onClose,
  loading = false,
}: SnackbarProps) {
  const alert = tone === 'error' || tone === 'warning';
  const hasAction = hasText(actionLabel);
  const hasSecondary = hasText(secondaryLabel);

  return (
    <Frame
      $tone={tone}
      role={alert ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
    >
      <Lead $tone={tone}>
        {loading ? (
          <Loader size={ICON_SIZE} delay={0} color="currentColor" />
        ) : (
          <Icon glyph={icon ?? TONE_ICONS[tone]} size={ICON_SIZE} />
        )}
      </Lead>
      <Text>
        <Title>{title}</Title>
        {hasText(message) ? <Message>{message}</Message> : null}
        {hasAction || hasSecondary ? (
          <Actions>
            {hasAction ? (
              <Button
                variant={
                  tone === 'info' || tone === 'success'
                    ? 'primary'
                    : 'secondary'
                }
                size="sm"
                icon={actionIcon}
                label={actionLabel}
                onClick={onAction}
              />
            ) : null}
            {hasSecondary ? (
              <Button
                variant="ghost"
                size="sm"
                label={secondaryLabel}
                onClick={onSecondary}
              />
            ) : null}
          </Actions>
        ) : null}
      </Text>
      {onClose ? (
        <Close>
          <Button
            variant="ghost"
            size="sm"
            icon="x"
            title="Dismiss"
            onClick={onClose}
          />
        </Close>
      ) : null}
    </Frame>
  );
}
