import { Icon } from '../../primitives/Icon/Icon.tsx';
import {
  Item,
  Label,
  List,
  Square,
  Step,
  type StepState,
} from './Stepper.styles.ts';

type StepperProps = {
  steps: string[];
  current: number;
  onStep: (index: number) => void;
};

const CHECK_SIZE = 13;

function stateOf(index: number, current: number): StepState {
  if (index < current) {
    return 'done';
  }
  return index === current ? 'current' : 'future';
}

// The steps of a wizard in equal cells. A done step reports its index on a
// click; the current step reports nothing, a future step is disabled.
export function Stepper({ steps, current, onStep }: StepperProps) {
  return (
    <List $count={steps.length}>
      {steps.map((label, index) => {
        const state = stateOf(index, current);
        return (
          <Item key={label}>
            <Step
              type="button"
              onClick={() => {
                if (state === 'done') {
                  onStep(index);
                }
              }}
              disabled={state === 'future'}
              aria-current={state === 'current' ? 'step' : undefined}
              $state={state}
              $first={index === 0}
            >
              <Square $state={state}>
                {state === 'done' ? (
                  <Icon glyph="check" size={CHECK_SIZE} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </Square>
              <Label>{label}</Label>
            </Step>
          </Item>
        );
      })}
    </List>
  );
}
