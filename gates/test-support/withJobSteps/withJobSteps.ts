import {
  jobSteps,
  type Workflow,
  type WorkflowStep,
} from '../../../scripts/readWorkflow/readWorkflow.ts';

// The workflow with the named job's steps changed by `change`.
export function withJobSteps(
  workflow: Workflow,
  job: string,
  change: (steps: WorkflowStep[]) => WorkflowStep[],
): Workflow {
  return {
    ...workflow,
    jobs: {
      ...workflow.jobs,
      [job]: {
        ...workflow.jobs?.[job],
        steps: change(jobSteps(workflow, job)),
      },
    },
  };
}
