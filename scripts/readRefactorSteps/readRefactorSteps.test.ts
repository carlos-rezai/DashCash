import { describe, expect, it } from 'vitest';
import {
  hasRefactorStep,
  readRefactorSteps,
  buildRefactorPlanPath,
} from './readRefactorSteps.ts';

const PLAN = [
  '# Refactor plan',
  '',
  '- [x] 01 extract the parser',
  '- [ ] 02 rename the sample',
  '- [ ] 03',
  '  - [ ] 04 nested, not a step',
  '- [X] 05 upper-case mark, not a step',
  '- [ ] 060 long number',
  'text - [ ] 07 mid-line, not a step',
  '',
].join('\n');

describe('buildRefactorPlanPath', () => {
  it('puts the plan inside the folder', () => {
    expect(buildRefactorPlanPath('docs/features/01-sample')).toBe(
      'docs/features/01-sample/refactor-plan.md',
    );
  });
});

describe('readRefactorSteps', () => {
  it('reads each step with its number and whether it is ticked', () => {
    expect(readRefactorSteps(PLAN)).toEqual([
      { number: '01', ticked: true },
      { number: '02', ticked: false },
      { number: '03', ticked: false },
      { number: '060', ticked: false },
    ]);
  });

  it('reads nothing from an empty plan', () => {
    expect(readRefactorSteps('')).toEqual([]);
  });
});

describe('hasRefactorStep', () => {
  it.each(['01', '02', '03'])('finds step %s', (number) => {
    expect(hasRefactorStep(PLAN, number)).toBe(true);
  });

  it.each(['04', '05', '06', '07', '08'])('does not find step %s', (number) => {
    expect(hasRefactorStep(PLAN, number)).toBe(false);
  });
});
