import { execFileSync } from 'node:child_process';
import isIgnored from '@commitlint/is-ignored';
import config from '../../commitlint.config.js';
import {
  reportViolations,
  type Violation,
} from '../reportViolations/reportViolations.ts';
import { readBranchRange } from '../readBranchRange/readBranchRange.ts';

const HEADER_PATTERN = config.parserPreset.parserOpts.headerPattern;
const TICKET_REQUIRED = ['feat', 'fix', 'test', 'refactor'];
const FEATURES_FOLDER = 'docs/features/';
const REFACTOR_PLAN = 'refactor-plan.md';
const FEATURE_BRANCH = /^(?:feat|refactor)\/\d+-(.+)$/;
const TICKET_FILE = /^\d{2}-[^/]+\.md$/;

type ParsedHeader = {
  type: string;
  feature: string;
  ticket: string | undefined;
};

function parseHeader(message: string): ParsedHeader | undefined {
  const header = message.trim().split('\n')[0] ?? '';
  const match = HEADER_PATTERN.exec(header);
  if (match === null) {
    return undefined;
  }
  const [, type = '', feature = '', ticket] = match;
  return { type, feature, ticket };
}

// The Feature folder (`<NN>-<feature>`) of a feature name, if one is tracked.
function findFeatureFolder(
  feature: string,
  trackedPaths: readonly string[],
): string | undefined {
  for (const path of trackedPaths) {
    if (!path.startsWith(FEATURES_FOLDER)) {
      continue;
    }
    const folder = path.slice(FEATURES_FOLDER.length).split('/')[0] ?? '';
    if (folder.replace(/^\d+-/, '') === feature && /^\d+-/.test(folder)) {
      return folder;
    }
  }
  return undefined;
}

function isTicket(folderPath: string, number: string, path: string): boolean {
  if (!path.startsWith(`${folderPath}/`)) {
    return false;
  }
  const file = path.slice(folderPath.length + 1);
  return TICKET_FILE.test(file) && file.startsWith(`${number}-`);
}

function isRefactorStep(plan: string, number: string): boolean {
  return new RegExp(`^- [[][ x]] ${number}(?: |$)`, 'm').test(plan);
}

function ticketReason(
  parsed: ParsedHeader,
  trackedPaths: readonly string[],
  readFile: (path: string) => string,
  folder: string,
): string | undefined {
  const { type, feature, ticket } = parsed;
  if (ticket === undefined) {
    return TICKET_REQUIRED.includes(type)
      ? `a ${type} commit must carry a ticket number`
      : undefined;
  }
  const folderPath = `${FEATURES_FOLDER}${folder}`;
  if (type === 'refactor') {
    const planPath = `${folderPath}/${REFACTOR_PLAN}`;
    const plan = trackedPaths.includes(planPath) ? readFile(planPath) : '';
    return isRefactorStep(plan, ticket)
      ? undefined
      : `no refactor step ${ticket} in ${planPath}`;
  }
  return trackedPaths.some((path) => isTicket(folderPath, ticket, path))
    ? undefined
    : `no ticket ${ticket} for ${feature} in ${folderPath}`;
}

// Checks that every commit names a Feature folder and, by type, a Ticket or
// Refactor step that exists in the committed tree. A merge commit is skipped
// and a header that does not parse is left to the commit gate.
export function checkTicketReferences(
  commits: readonly string[],
  trackedPaths: readonly string[],
  readFile: (path: string) => string,
  branch: string | undefined,
): Violation[] {
  const branchFeature =
    branch === undefined ? undefined : FEATURE_BRANCH.exec(branch)?.[1];
  const violations: Violation[] = [];
  for (const message of commits) {
    if (isIgnored(message)) {
      continue;
    }
    const parsed = parseHeader(message);
    if (parsed === undefined) {
      continue;
    }
    const subject = message.trim().split('\n')[0] ?? '';
    const folder = findFeatureFolder(parsed.feature, trackedPaths);
    let reason: string | undefined;
    if (folder === undefined) {
      reason = `no feature folder docs/features/<nn>-${parsed.feature}`;
    } else if (
      branchFeature !== undefined &&
      parsed.feature !== branchFeature
    ) {
      reason = `the feature ${parsed.feature} is not the branch's feature ${branchFeature}`;
    } else {
      reason = ticketReason(parsed, trackedPaths, readFile, folder);
    }
    if (reason !== undefined) {
      violations.push({ subject, reason });
    }
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
    const { branch, commits } = readBranchRange(cwd);
    const trackedPaths = git(cwd, ['ls-tree', '-r', '--name-only', 'HEAD'])
      .split('\n')
      .filter((path) => path !== '');
    const violations = checkTicketReferences(
      commits.map((commit) => commit.message),
      trackedPaths,
      (path) => git(cwd, ['show', `HEAD:${path}`]),
      branch,
    );
    process.exitCode = reportViolations(violations);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
