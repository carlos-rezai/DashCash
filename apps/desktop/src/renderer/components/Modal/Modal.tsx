import { useEffect, useId, type MouseEvent, type ReactNode } from 'react';
import { Button } from '../../primitives/Button/Button.tsx';
import {
  Backdrop,
  Content,
  Header,
  Heading,
  Panel,
  Subtitle,
  Title,
} from './Modal.styles.ts';

type ModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  width?: number;
  onClose: () => void;
  children: ReactNode;
};

// A dialog over a dark backdrop: a title, an optional subtitle and the
// content, whose last row holds the actions. Esc and a click on the backdrop
// close it; a click inside the panel does not.
export function Modal({
  open,
  title,
  subtitle,
  width,
  onClose,
  children,
}: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const onBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <Backdrop onClick={onBackdrop}>
      <Panel
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        $width={width}
      >
        <Header>
          <Heading>
            <Title id={titleId}>{title}</Title>
            {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            icon="x"
            title="Close"
            onClick={onClose}
          />
        </Header>
        <Content>{children}</Content>
      </Panel>
    </Backdrop>
  );
}
