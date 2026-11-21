import { styled, type DefaultTheme } from 'styled-components';

export type StepState = 'done' | 'current' | 'future';

type Look = {
  text: string;
  squareBorder: string;
  squareFill: string;
  squareText: string;
};

// Stepper.dc.html: the colours of a step's label and of its square by state.
function look(state: StepState, theme: DefaultTheme): Look {
  const { color } = theme;
  switch (state) {
    case 'done':
      return {
        text: color.text,
        squareBorder: color.accent[500],
        squareFill: color.accent[500],
        squareText: color.bg,
      };
    case 'current':
      return {
        text: color.text,
        squareBorder: color.accent[500],
        squareFill: 'transparent',
        squareText: color.accent[700],
      };
    case 'future':
      return {
        text: color.textFaint,
        squareBorder: color.divider,
        squareFill: 'transparent',
        squareText: color.textFaint,
      };
  }
}

// The list: one equal cell per step in a row, inside a divider frame.
export const List = styled.ol<{ $count: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid ${({ theme }) => theme.color.divider};
`;

export const Item = styled.li`
  display: flex;
  min-width: 0;
`;

type StepProps = { $state: StepState; $first: boolean };

// The step fills its cell. Only a done step is clicked, so only it shows the
// pointer; the disabled rule keeps a future step on the default cursor over
// the global one.
export const Step = styled.button<StepProps>`
  box-sizing: border-box;
  flex: 1;
  min-width: 0;
  height: ${({ theme }) => theme.size.stepperStep};
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.stepperGap};
  padding: ${({ theme }) => theme.space.stepperPaddingY}
    ${({ theme }) => theme.space.stepperPaddingX};
  background: ${({ $state, theme }) =>
    $state === 'current' ? theme.color.accent[100] : 'transparent'};
  border: 0;
  border-left: ${({ $first, theme }) =>
    $first ? '0' : `1px solid ${theme.color.divider}`};
  box-shadow: ${({ $state, theme }) =>
    $state === 'current'
      ? `inset 0 -${theme.size.stepperBar} 0 ${theme.color.accent[500]}`
      : 'none'};
  color: ${({ $state, theme }) => look($state, theme).text};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.fontSize.md};
  text-align: left;
  cursor: ${({ $state }) => ($state === 'done' ? 'pointer' : 'default')};

  &:disabled {
    cursor: default;
  }
`;

// The square: the check on a done step, the number on any other.
export const Square = styled.span<{ $state: StepState }>`
  box-sizing: border-box;
  width: ${({ theme }) => theme.size.stepperSquare};
  height: ${({ theme }) => theme.size.stepperSquare};
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid ${({ $state, theme }) => look($state, theme).squareBorder};
  background: ${({ $state, theme }) => look($state, theme).squareFill};
  color: ${({ $state, theme }) => look($state, theme).squareText};
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

export const Label = styled.span`
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
