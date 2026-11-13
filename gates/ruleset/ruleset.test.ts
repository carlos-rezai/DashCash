import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// The Ruleset on main, kept as code in .github/rulesets/main.json, and its
// wiring to the pull-request workflow: the one Required check is its
// pull-request job, the only job of any workflow reporting under that name,
// which runs Verify full and the Pull-request check.

type RulesetRule = {
  type: string;
  parameters?: Record<string, unknown>;
};

type Ruleset = {
  name?: unknown;
  target?: unknown;
  enforcement?: unknown;
  bypass_actors?: unknown;
  conditions?: { ref_name?: { include?: unknown; exclude?: unknown } };
  rules?: RulesetRule[];
};

type WorkflowJob = {
  name?: string;
  steps?: { run?: string }[];
};

type Workflow = {
  jobs: Record<string, WorkflowJob | undefined>;
};

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function readRootFile(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

function readRuleset(): Ruleset {
  return JSON.parse(readRootFile('.github/rulesets/main.json')) as Ruleset;
}

const WORKFLOWS_FOLDER = '.github/workflows';
const PULL_REQUEST_WORKFLOW = 'pull-request.yml';

// A workflow file that does not exist reads as a workflow without jobs, so
// every check on it fails at its assertion.
function readWorkflow(file: string): Workflow {
  const path = join(ROOT, WORKFLOWS_FOLDER, file);
  if (!existsSync(path)) {
    return { jobs: {} };
  }
  const workflow = (parse(readFileSync(path, 'utf8')) ??
    {}) as Partial<Workflow>;
  return { jobs: workflow.jobs ?? {} };
}

function workflowFiles(): string[] {
  return readdirSync(join(ROOT, WORKFLOWS_FOLDER))
    .filter((file) => /\.ya?ml$/.test(file))
    .sort();
}

function findRule(ruleset: Ruleset, type: string): RulesetRule | undefined {
  return (ruleset.rules ?? []).find((rule) => rule.type === type);
}

function ruleParameters(
  ruleset: Ruleset,
  type: string,
): Record<string, unknown> {
  return findRule(ruleset, type)?.parameters ?? {};
}

// The names of the status checks the Ruleset waits for.
function requiredCheckNames(ruleset: Ruleset): unknown[] {
  const checks = ruleParameters(ruleset, 'required_status_checks')[
    'required_status_checks'
  ];
  if (!Array.isArray(checks)) {
    return [];
  }
  return checks.map((check: { context?: unknown }) => check.context);
}

// The workflow jobs whose status check carries the given name: a job reports
// under its name, or under its id when it has none.
function jobsReportingAs(workflow: Workflow, checkName: unknown): string[] {
  return Object.entries(workflow.jobs)
    .filter(([id, job]) => (job?.name ?? id) === checkName)
    .map(([id]) => id);
}

function jobCommands(workflow: Workflow, id: string): string[] {
  return (workflow.jobs[id]?.steps ?? []).flatMap((step) =>
    (step.run ?? '')
      .split('\n')
      .map((command) => command.trim())
      .filter((command) => command !== ''),
  );
}

describe('the Ruleset file', () => {
  it('is an active branch ruleset targeting main only', () => {
    const ruleset = readRuleset();

    expect(typeof ruleset.name).toBe('string');
    expect(ruleset.name).not.toBe('');
    expect(ruleset.target).toBe('branch');
    expect(ruleset.enforcement).toBe('active');
    expect(ruleset.conditions?.ref_name?.include).toEqual(['refs/heads/main']);
    expect(ruleset.conditions?.ref_name?.exclude ?? []).toEqual([]);
  });

  it('requires a pull request with 0 approvals and no code-owner review', () => {
    const ruleset = readRuleset();
    const pullRequest = ruleParameters(ruleset, 'pull_request');

    expect(findRule(ruleset, 'pull_request')).toBeDefined();
    expect(pullRequest['required_approving_review_count']).toBe(0);
    expect(pullRequest['require_code_owner_review']).toBe(false);
  });

  it('requires the pull-request check, strict (up to date)', () => {
    const ruleset = readRuleset();

    expect(requiredCheckNames(ruleset)).toEqual(['pull-request']);
    expect(
      ruleParameters(ruleset, 'required_status_checks')[
        'strict_required_status_checks_policy'
      ],
    ).toBe(true);
  });

  it('blocks deletion and non-fast-forward pushes', () => {
    const ruleset = readRuleset();

    expect(findRule(ruleset, 'deletion')).toBeDefined();
    expect(findRule(ruleset, 'non_fast_forward')).toBeDefined();
  });

  it('has no bypass actors', () => {
    expect(readRuleset().bypass_actors ?? []).toEqual([]);
  });
});

describe('the Ruleset wiring', () => {
  it('names exactly one Required check, reported by the pull-request job of the pull-request workflow', () => {
    const checks = requiredCheckNames(readRuleset());

    expect(checks).toHaveLength(1);
    expect(
      jobsReportingAs(readWorkflow(PULL_REQUEST_WORKFLOW), checks[0]),
    ).toEqual(['pull-request']);
  });

  it('has exactly one job across every workflow file reporting as the Required check', () => {
    const [check] = requiredCheckNames(readRuleset());
    const reporting = workflowFiles().flatMap((file) =>
      jobsReportingAs(readWorkflow(file), check).map((id) => `${file}: ${id}`),
    );

    expect(reporting).toEqual([`${PULL_REQUEST_WORKFLOW}: pull-request`]);
  });

  it('waits for a check that runs verify:full and check:pr', () => {
    const workflow = readWorkflow(PULL_REQUEST_WORKFLOW);
    const [job] = requiredCheckNames(readRuleset()).flatMap((check) =>
      jobsReportingAs(workflow, check),
    );
    const commands = job === undefined ? [] : jobCommands(workflow, job);

    expect(commands).toContain('xvfb-run --auto-servernum npm run verify:full');
    expect(commands).toContain('npm run check:pr');
  });

  it('allows no merge method other than merge', () => {
    const methods = ruleParameters(readRuleset(), 'pull_request')[
      'allowed_merge_methods'
    ];

    expect(Array.isArray(methods)).toBe(true);
    expect(methods).not.toContain('squash');
    expect(methods).not.toContain('rebase');
    expect(methods).toEqual(['merge']);
  });
});
