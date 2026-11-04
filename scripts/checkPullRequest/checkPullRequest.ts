import {
  lintCommitMessages,
  loadCommitConfig,
} from '../lintCommitMessages/lintCommitMessages.ts';
import { parseCommitHeader } from '../parseCommitHeader/parseCommitHeader.ts';
import { readBranchName } from '../readBranchRange/readBranchRange.ts';
import {
  buildFeatureFolderPath,
  parseFeatureBranch,
} from '../readFeatureFolders/readFeatureFolders.ts';
import {
  readRefactorSteps,
  buildRefactorPlanPath,
} from '../readRefactorSteps/readRefactorSteps.ts';
import { listTickets, readTicketStatus } from '../readTickets/readTickets.ts';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';
import { listHeadPaths, readHeadFile } from '../runGit/runGit.ts';

const RENOVATE_BRANCH = /^renovate\/.+$/;
// The feature every Renovate pull request names; its title is
// `chore: [supply-chain] <description>`.
export const RENOVATE_FEATURE = 'supply-chain';

export type PullRequestInput = {
  branch: string | undefined;
  title: string | undefined;
  trackedPaths: readonly string[];
  readFile: (path: string) => string;
  lintTitle: (header: string) => Promise<Violation[]>;
};

function findUnfinishedTickets(
  folderPath: string,
  input: PullRequestInput,
  subject: string,
): Violation[] {
  const tickets = listTickets(folderPath, input.trackedPaths);
  if (tickets.length === 0) {
    return [{ subject, reason: `no ticket in ${folderPath}` }];
  }
  return tickets
    .filter((path) => readTicketStatus(input.readFile(path)) !== 'done')
    .map((path) => ({ subject, reason: `${path} is not status: done` }));
}

function findUntickedRefactorSteps(
  folderPath: string,
  input: PullRequestInput,
  subject: string,
): Violation[] {
  const planPath = buildRefactorPlanPath(folderPath);
  if (!input.trackedPaths.includes(planPath)) {
    return [{ subject, reason: `${planPath} is missing` }];
  }
  return readRefactorSteps(input.readFile(planPath))
    .filter((step) => !step.ticked)
    .map((step) => ({
      subject,
      reason: `refactor step ${step.number} in ${planPath} is not ticked`,
    }));
}

async function checkRenovateTitle(
  title: string,
  lintTitle: PullRequestInput['lintTitle'],
): Promise<Violation[]> {
  const violations = await lintTitle(title);
  const header = parseCommitHeader(title);
  if (header === undefined) {
    return violations.length > 0
      ? violations
      : [{ subject: title, reason: 'the title does not follow the format' }];
  }
  if (header.type !== 'chore' || header.red) {
    violations.push({ subject: title, reason: 'a renovate title is chore:' });
  }
  if (header.feature !== RENOVATE_FEATURE) {
    violations.push({
      subject: title,
      reason: `a renovate title names the feature ${RENOVATE_FEATURE}`,
    });
  }
  if (header.ticket !== undefined) {
    violations.push({
      subject: title,
      reason: 'a renovate title carries no number',
    });
  }
  return violations;
}

async function checkPlainTitle(
  title: string,
  lintTitle: PullRequestInput['lintTitle'],
): Promise<Violation[]> {
  const violations = await lintTitle(title);
  if (parseCommitHeader(title)?.ticket !== undefined) {
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
  const featureBranch = parseFeatureBranch(branch);
  const isRenovateBranch = RENOVATE_BRANCH.test(branch ?? '');
  if (featureBranch?.kind === 'feat') {
    violations.push(
      ...findUnfinishedTickets(
        buildFeatureFolderPath(featureBranch.folder),
        input,
        subject,
      ),
    );
  } else if (featureBranch?.kind === 'refactor') {
    violations.push(
      ...findUntickedRefactorSteps(
        buildFeatureFolderPath(featureBranch.folder),
        input,
        subject,
      ),
    );
  } else if (!isRenovateBranch) {
    violations.push({
      subject: branch ?? '(no branch)',
      reason:
        'a pull request must come from feat/<nn>-<feature>, refactor/<nn>-<feature> or renovate/*',
    });
  }
  if (title !== undefined && title !== '') {
    const titleViolations = isRenovateBranch
      ? await checkRenovateTitle(title, lintTitle)
      : await checkPlainTitle(title, lintTitle);
    violations.push(...titleViolations);
  }
  return violations;
}

if (import.meta.main) {
  await runGate(async () => {
    const cwd = process.cwd();
    const loaded = await loadCommitConfig(cwd);
    return checkPullRequest({
      branch: readBranchName(cwd, process.env),
      title: process.env['PR_TITLE'],
      trackedPaths: listHeadPaths(cwd),
      readFile: (path) => readHeadFile(cwd, path),
      lintTitle: (header) => lintCommitMessages([header], loaded),
    });
  });
}
