import isIgnored from '@commitlint/is-ignored';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';
import { readBranchRange } from '../readBranchRange/readBranchRange.ts';
import {
  FEATURES_FOLDER,
  buildFeatureFolderPath,
  findFeatureFolder,
  parseFeatureBranch,
} from '../readFeatureFolders/readFeatureFolders.ts';
import {
  hasRefactorStep,
  buildRefactorPlanPath,
} from '../readRefactorSteps/readRefactorSteps.ts';
import {
  parseCommitHeader,
  readCommitHeader,
  type CommitHeader,
} from '../parseCommitHeader/parseCommitHeader.ts';
import { hasTicket } from '../readTickets/readTickets.ts';
import { listHeadPaths, readHeadFile } from '../runGit/runGit.ts';

const TICKET_REQUIRED = ['feat', 'fix', 'test', 'refactor'];

function ticketReason(
  parsed: CommitHeader,
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
  const folderPath = buildFeatureFolderPath(folder);
  if (type === 'refactor') {
    const planPath = buildRefactorPlanPath(folderPath);
    const plan = trackedPaths.includes(planPath) ? readFile(planPath) : '';
    return hasRefactorStep(plan, ticket)
      ? undefined
      : `no refactor step ${ticket} in ${planPath}`;
  }
  return hasTicket(folderPath, ticket, trackedPaths)
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
  const branchFeature = parseFeatureBranch(branch)?.feature;
  const violations: Violation[] = [];
  for (const message of commits) {
    if (isIgnored(message)) {
      continue;
    }
    const header = readCommitHeader(message);
    const parsed = parseCommitHeader(header);
    if (parsed === undefined) {
      continue;
    }
    const folder = findFeatureFolder(parsed.feature, trackedPaths);
    let reason: string | undefined;
    if (folder === undefined) {
      reason = `no feature folder ${FEATURES_FOLDER}/<nn>-${parsed.feature}`;
    } else if (
      branchFeature !== undefined &&
      parsed.feature !== branchFeature
    ) {
      reason = `the feature ${parsed.feature} is not the branch's feature ${branchFeature}`;
    } else {
      reason = ticketReason(parsed, trackedPaths, readFile, folder);
    }
    if (reason !== undefined) {
      violations.push({ subject: header, reason });
    }
  }
  return violations;
}

if (import.meta.main) {
  await runGate(() => {
    const cwd = process.cwd();
    const { branch, commits } = readBranchRange(cwd);
    return checkTicketReferences(
      commits.map((commit) => commit.message),
      listHeadPaths(cwd),
      (path) => readHeadFile(cwd, path),
      branch,
    );
  });
}
