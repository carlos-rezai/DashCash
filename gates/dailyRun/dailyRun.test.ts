import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobCommands,
  readWorkflow,
  triggers,
  type Workflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { withJobSteps } from '../test-support/withJobSteps/withJobSteps.ts';
import { findDailyWiringProblems } from './dailyRun.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const DAILY_WORKFLOW = 'daily.yml';
const DAILY_SCHEDULE = '0 5 * * *';
const DAILY_COMMANDS = [
  'npm ci',
  'npm run check:audit',
  'npm run check:quarantine',
];
// The gates of Verify the daily job runs too.
const DAILY_GATES = ['check:audit', 'check:quarantine'];
const DAILY_JOBS = ['daily', 'mutation'];

// The gates of Verify, in their fixed order. Every ticket that adds a gate
// inserts it here at its place.
const VERIFY_GATES = [
  'format:check',
  'lint',
  'typecheck',
  'lint:deps',
  'test',
  'check:commits',
  'check:tickets',
  'check:data-files',
  'check:docs-drift',
  'check:licenses',
  'check:audit',
  'check:quarantine',
];

// The workflow without the named trigger.
function withoutTrigger(workflow: Workflow, event: string): Workflow {
  return {
    ...workflow,
    on: Object.fromEntries(
      Object.entries(triggers(workflow)).filter(([name]) => name !== event),
    ),
  };
}

function withoutFullHistory(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'daily', (steps) =>
    steps.map((step) =>
      (step.uses ?? '').startsWith('actions/checkout@')
        ? {
            ...step,
            with: Object.fromEntries(
              Object.entries(step.with ?? {}).filter(
                ([key]) => key !== 'fetch-depth',
              ),
            ),
          }
        : step,
    ),
  );
}

// The daily job without the command, wherever a step runs it; a step left
// with no command is dropped.
function withoutDailyCommand(
  command: string,
): (workflow: Workflow) => Workflow {
  return (workflow) =>
    withJobSteps(workflow, 'daily', (steps) =>
      steps.flatMap((step) => {
        if (step.run === undefined) {
          return [step];
        }
        const run = step.run
          .split('\n')
          .filter((line) => line.trim() !== command)
          .join('\n');
        return run.trim() === '' ? [] : [{ ...step, run }];
      }),
    );
}

const withoutAuditStep = withoutDailyCommand('npm run check:audit');
const withoutQuarantineStep = withoutDailyCommand('npm run check:quarantine');

const dailyWorkflow = readWorkflow(ROOT, DAILY_WORKFLOW);

describe('daily run', () => {
  it('triggers the daily workflow, Daily, only by the schedule 0 5 * * * and workflow_dispatch', () => {
    const on = triggers(dailyWorkflow);

    expect(dailyWorkflow.name).toBe('Daily');
    expect(Object.keys(on).sort()).toEqual(['schedule', 'workflow_dispatch']);
    expect(on['schedule']).toEqual([{ cron: DAILY_SCHEDULE }]);
  });

  it('gives the daily workflow exactly the jobs daily and mutation', () => {
    expect(Object.keys(dailyWorkflow.jobs ?? {})).toEqual(DAILY_JOBS);
  });

  it('runs npm ci, then npm run check:audit and npm run check:quarantine and no other gate of verify in the daily job', () => {
    const commands = jobCommands(dailyWorkflow, 'daily');

    expect(commands).toEqual(DAILY_COMMANDS);
    for (const gate of VERIFY_GATES.filter(
      (name) => !DAILY_GATES.includes(name),
    )) {
      expect(commands, gate).not.toContain(`npm run ${gate}`);
    }
    expect(commands).not.toContain('npm run verify');
    expect(commands).not.toContain('npm run verify:full');
  });

  it('finds nothing missing from the daily wiring', () => {
    expect(findDailyWiringProblems(dailyWorkflow)).toEqual([]);
  });

  it.each([
    [
      'schedule',
      (workflow: Workflow) => withoutTrigger(workflow, 'schedule'),
      `no schedule trigger ${DAILY_SCHEDULE}`,
    ],
    [
      'manual trigger',
      (workflow: Workflow) => withoutTrigger(workflow, 'workflow_dispatch'),
      'no workflow_dispatch trigger',
    ],
    [
      'full-history checkout',
      withoutFullHistory,
      'the daily job does not check out full history',
    ],
    [
      'audit step',
      withoutAuditStep,
      'the daily job does not run npm run check:audit',
    ],
    [
      'quarantine step',
      withoutQuarantineStep,
      'the daily job does not run npm run check:quarantine',
    ],
  ])(
    'fails the daily wiring when the %s is removed',
    (_part, remove, problem) => {
      const before = findDailyWiringProblems(dailyWorkflow);
      const added = findDailyWiringProblems(remove(dailyWorkflow)).filter(
        (found) => !before.includes(found),
      );

      expect(added).toEqual([problem]);
    },
  );
});
