import { runGit } from '../runGit/runGit.ts';

export type BranchCommit = { hash: string; message: string };
export type BranchRange = {
  branch: string | undefined;
  commits: BranchCommit[];
};

const BASE_REF = 'origin/main';
const FIELD_SEPARATOR = '\x1f';
const RECORD_SEPARATOR = '\x1e';

// The branch name: GITHUB_HEAD_REF (pull request runs), then GITHUB_REF_NAME
// (push runs), then the current branch. Empty values are skipped.
export function resolveBranchName(
  env: Readonly<Record<string, string | undefined>>,
  currentBranch?: string,
): string | undefined {
  const candidates = [
    env['GITHUB_HEAD_REF'],
    env['GITHUB_REF_NAME'],
    currentBranch,
  ];
  return candidates.find(
    (candidate) => candidate !== undefined && candidate !== '',
  );
}

// The branch name for the given environment, falling back to the repository's
// current branch.
export function readBranchName(
  cwd: string,
  env: Readonly<Record<string, string | undefined>>,
): string | undefined {
  return resolveBranchName(
    env,
    runGit(cwd, ['branch', '--show-current']).trim(),
  );
}

function hasBaseRef(cwd: string): boolean {
  try {
    runGit(cwd, ['rev-parse', '--verify', '--quiet', `${BASE_REF}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

// Reads the branch name and every commit since the branch left origin/main.
export function readBranchRange(cwd: string): BranchRange {
  if (!hasBaseRef(cwd)) {
    throw new Error(
      `${BASE_REF} is missing: fetch ${BASE_REF} first (git fetch origin main)`,
    );
  }
  const branch = readBranchName(cwd, process.env);
  const log = runGit(cwd, [
    'log',
    `--format=%H${FIELD_SEPARATOR}%B${RECORD_SEPARATOR}`,
    `${BASE_REF}..HEAD`,
  ]);
  const commits = log
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter((record) => record !== '')
    .map((record) => {
      const [hash = '', message = ''] = record.split(FIELD_SEPARATOR);
      return { hash, message: message.trim() };
    });
  return { branch, commits };
}
