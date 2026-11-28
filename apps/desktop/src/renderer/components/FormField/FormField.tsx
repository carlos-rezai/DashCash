import { useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { hasText } from '../../utils/hasText/hasText.ts';
import { Frame, Label, Message } from './FormField.styles.ts';

type FormFieldProps = {
  label: string;
  hint?: string;
  // Replaces the hint, in the danger colour.
  error?: string;
  // The control the label names.
  children: ReactNode;
};

const CONTROL = 'input, select';

// A label above a control, a hint below it, or an error in the hint's place.
// The label names the control by `for`, not by wrapping it: a wrapping label
// would add a select's chosen option to the control's name.
export function FormField({ label, hint, error, children }: FormFieldProps) {
  const controlId = useId();
  const frame = useRef<HTMLDivElement>(null);

  // The primitives take no id; give the control it holds the one the label
  // points to.
  useLayoutEffect(() => {
    const control = frame.current?.querySelector(CONTROL);
    if (control !== null && control !== undefined) {
      control.id = controlId;
    }
  });

  const failed = hasText(error);
  const message = failed ? error : hint;
  return (
    <Frame ref={frame}>
      <Label htmlFor={controlId}>{label}</Label>
      {children}
      {hasText(message) ? <Message $error={failed}>{message}</Message> : null}
    </Frame>
  );
}
