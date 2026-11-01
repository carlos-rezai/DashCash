export const REFACTOR_PLAN = 'refactor-plan.md';

const REFACTOR_STEP = /^- \[( |x)\] (\d+)(?: .*)?$/gm;

export type RefactorStep = { number: string; ticked: boolean };

// The repository path of a Feature folder's refactor plan.
export function refactorPlanPath(folderPath: string): string {
  return `${folderPath}/${REFACTOR_PLAN}`;
}

// The Refactor steps of a refactor plan, in order: each a `- [ ] <nn>` or
// `- [x] <nn>` line.
export function readRefactorSteps(plan: string): RefactorStep[] {
  return [...plan.matchAll(REFACTOR_STEP)].map(([, mark, number]) => ({
    number: number ?? '',
    ticked: mark === 'x',
  }));
}

// Whether a refactor plan holds a Refactor step with this number.
export function hasRefactorStep(plan: string, number: string): boolean {
  return readRefactorSteps(plan).some((step) => step.number === number);
}
