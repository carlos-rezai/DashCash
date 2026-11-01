import { execFileSync } from 'node:child_process';
import load from '@commitlint/load';
import config from '../../commitlint.config.js';
import { lintCommitMessages } from '../checkCommits/checkCommits.ts';
import { resolveBranchName } from '../readBranchRange/readBranchRange.ts';
import {
  reportViolations,
  type Violation,
} from '../reportViolations/reportViolations.ts';

const HEADER_PATTERN = config.parserPreset.parserOpts.headerPattern;
const FEATURES_FOLDER = 'docs/features';
const REFACTOR_PLAN = 'refactor-plan.md';
const FEATURE_BRANCH = /^feat\/(\d+-.+)$/;
const REFACTOR_BRANCH = /^refactor\/(\d+-.+)$/;
const RENOVATE_BRANCH = /^renovate\/.+$/;
const RENOVATE_TITLE = /^chore: (.*)$/;
const TICKET_FILE = /^\d{2}-[^/]+\.md$/;
const STATUS_LINE = /^status:[ \t]*([^\s#]*)/m;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
const REFACTOR_STEP = /^- \[( |x)\] (\d+)(?: .*)?$/gm;
// A stand-in feature, so that a Renovate description meets the description
// rules of the commitlint config without a feature of its own.
const STAND_IN_FEATURE = 'renovate';

export type PullRequestInput = {
  branch: string | undefined;
  title: string | undefined;
  trackedPaths: readonly string[];
  readFile: (path: string) => string;
  lintTitle: (header: string) => Promise<Violation[]>;
};

function ticketStatus(content: string): string | undefined {
  const frontMatter = FRONT_MATTER.exec(content)?.[1] ?? '';
  return STATUS_LINE.exec(frontMatter)?.[1];
}

function checkTickets(
  folderPath: string,
  input: PullRequestInput,
  subject: string,
): Violation[] {
  const tickets = input.trackedPaths.filter(
    (path) =>
      path.startsWith(`${folderPath}/`) &&
      TICKET_FILE.test(path.slice(folderPath.length + 1)),
  );
  if (tickets.length === 0) {
    return [{ subject, reason: `no ticket in ${folderPath}` }];
  }
  return tickets
    .filter((path) => ticketStatus(input.readFile(path)) !== 'done')
    .map((path) => ({ subject, reason: `${path} is not status: done` }));
}

function checkRefactorSteps(
  folderPath: string,
  input: PullRequestInput,
  subject: string,
): Violation[] {
  const planPath = `${folderPath}/${REFACTOR_PLAN}`;
  if (!input.trackedPaths.includes(planPath)) {
    return [{ subject, reason: `${planPath} is missing` }];
  }
  return [...input.readFile(planPath).matchAll(REFACTOR_STEP)]
    .filter(([, mark]) => mark !== 'x')
    .map(([, , step]) => ({
      subject,
      reason: `refactor step ${step ?? ''} in ${planPath} is not ticked`,
    }));
}

async function checkRenovateTitle(
  title: string,
  lintTitle: PullRequestInput['lintTitle'],
): Promise<Violation[]> {
  const description = RENOVATE_TITLE.exec(title)?.[1];
  if (description === undefined) {
    return [
      { subject: title, reason: 'a renovate title must be "chore: ..."' },
    ];
  }
  if (/^(?:\[|\d)/.test(description)) {
    return [
      {
        subject: title,
        reason: 'a renovate title carries no feature and no number',
      },
    ];
  }
  const found = await lintTitle(`chore: [${STAND_IN_FEATURE}] ${description}`);
  return found.map(({ reason }) => ({ subject: title, reason }));
}

async function checkPlainTitle(
  title: string,
  lintTitle: PullRequestInput['lintTitle'],
): Promise<Violation[]> {
  const violations = await lintTitle(title);
  if (HEADER_PATTERN.exec(title)?.[3] !== undefined) {
    violations.push({
      subject: title,
      reason: 'a pull-request title carries no ticket number',
    });
  }
  return violations;
}

// Checks a pull request into main: the branch, the title and, by branch, the
// Tickets or Refactor steps of its Feature folder.
export async function checkPullRequest(
  input: PullRequestInput,
): Promise<Violation[]> {
  const { branch, title, lintTitle } = input;
  const subject = title ?? '';
  const violations: Violation[] = [];
  if (title === undefined || title === '') {
    violations.push({ subject: '(no title)', reason: 'the title is missing' });
  }
  const feature = FEATURE_BRANCH.exec(branch ?? '')?.[1];
  const refactor = REFACTOR_BRANCH.exec(branch ?? '')?.[1];
  if (feature !== undefined) {
    violations.push(
      ...checkTickets(`${FEATURES_FOLDER}/${feature}`, input, subject),
    );
  } else if (refactor !== undefined) {
    violations.push(
      ...checkRefactorSteps(`${FEATURES_FOLDER}/${refactor}`, input, subject),
    );
  } else if (!RENOVATE_BRANCH.test(branch ?? '')) {
    violations.push({
      subject: branch ?? '(no branch)',
      reason:
        'a pull request must come from feat/<nn>-<feature>, refactor/<nn>-<feature> or renovate/*',
    });
  }
  if (title !== undefined && title !== '') {
    const titleViolations = RENOVATE_BRANCH.test(branch ?? '')
      ? await checkRenovateTitle(title, lintTitle)
      : await checkPlainTitle(title, lintTitle);
    violations.push(...titleViolations);
  }
  return violations;
}

// Environment without the GIT_* variables a git hook sets, so the commands
// act on the repository in cwd.
function gitEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: gitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

if (import.meta.main) {
  try {
    const cwd = process.cwd();
    const loaded = await load({}, { cwd, file: 'commitlint.config.js' });
    const trackedPaths = git(cwd, ['ls-tree', '-r', '--name-only', 'HEAD'])
      .split('\n')
      .filter((path) => path !== '');
    const violations = await checkPullRequest({
      branch: resolveBranchName(
        process.env,
        git(cwd, ['branch', '--show-current']).trim(),
      ),
      title: process.env['PR_TITLE'],
      trackedPaths,
      readFile: (path) => git(cwd, ['show', `HEAD:${path}`]),
      lintTitle: (header) => lintCommitMessages([header], loaded),
    });
    process.exitCode = reportViolations(violations);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
