import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// The Ruleset on main, kept as code in .github/rulesets/main.json, and its
// wiring to the CI workflow: the one Required check is the pull-request job,
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

function readWorkflow(): Workflow {
  return parse(readRootFile('.github/workflows/ci.yml')) as Workflow;
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
  it('names exactly one Required check, reported by the pull-request job', () => {
    const checks = requiredCheckNames(readRuleset());

    expect(checks).toHaveLength(1);
    expect(jobsReportingAs(readWorkflow(), checks[0])).toEqual([
      'pull-request',
    ]);
  });

  it('waits for a check that runs verify:full and check:pr', () => {
    const workflow = readWorkflow();
    const [job] = requiredCheckNames(readRuleset()).flatMap((check) =>
      jobsReportingAs(workflow, check),
    );
    const commands = job === undefined ? [] : jobCommands(workflow, job);

    expect(commands).toContain('npm run verify:full');
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
