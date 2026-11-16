import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export type WorkflowStep = {
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
  env?: Record<string, unknown>;
  if?: unknown;
};

export type WorkflowJob = {
  if?: unknown;
  needs?: unknown;
  env?: Record<string, unknown>;
  steps?: WorkflowStep[];
};

export type Workflow = {
  name?: unknown;
  on?: unknown;
  jobs?: Record<string, WorkflowJob | undefined>;
};

const WORKFLOWS_FOLDER = join('.github', 'workflows');

// A workflow file that does not exist reads as an empty workflow, so every
// check on it fails at its assertion.
export function readWorkflow(root: string, file: string): Workflow {
  const path = join(root, WORKFLOWS_FOLDER, file);
  if (!existsSync(path)) {
    return {};
  }
  return (parse(readFileSync(path, 'utf8')) ?? {}) as Workflow;
}

export function workflowFiles(root: string): string[] {
  return readdirSync(join(root, WORKFLOWS_FOLDER))
    .filter((file) => /\.ya?ml$/.test(file))
    .sort();
}

// The events a workflow runs on, as written under its `on:` key.
export function triggers(workflow: Workflow): Record<string, unknown> {
  const { on } = workflow;
  if (typeof on === 'string') {
    return { [on]: null };
  }
  if (Array.isArray(on)) {
    return Object.fromEntries(
      on.map((event: unknown) => [String(event), null]),
    );
  }
  return typeof on === 'object' && on !== null
    ? (on as Record<string, unknown>)
    : {};
}

export function jobSteps(workflow: Workflow, job: string): WorkflowStep[] {
  return workflow.jobs?.[job]?.steps ?? [];
}

export function stepIndex(steps: WorkflowStep[], action: string): number {
  return steps.findIndex((step) => (step.uses ?? '').startsWith(`${action}@`));
}

export function jobCommands(workflow: Workflow, job: string): string[] {
  return jobSteps(workflow, job).flatMap((step) =>
    (step.run ?? '')
      .split('\n')
      .map((command) => command.trim())
      .filter((command) => command !== ''),
  );
}

export function chainedCommands(script: string | undefined): string[] {
  return (script ?? '').split('&&').map((command) => command.trim());
}

// The workflow files and jobs whose commands hold `text`, as `file: job`.
export function jobsRunning(root: string, text: string): string[] {
  return workflowFiles(root).flatMap((file) => {
    const workflow = readWorkflow(root, file);
    return Object.keys(workflow.jobs ?? {})
      .filter((job) =>
        jobCommands(workflow, job).some((command) => command.includes(text)),
      )
      .map((job) => `${file}: ${job}`);
  });
}
