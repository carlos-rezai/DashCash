import { execFileSync } from 'node:child_process';

// Environment without the GIT_* variables a git hook sets, so the commands
// act on the repository in cwd.
function buildGitEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
}

export function runGit(cwd: string, args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: buildGitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

// Every path in the index, as git tracks it.
export function listTrackedPaths(cwd: string): string[] {
  return runGit(cwd, ['ls-files', '-z'])
    .split('\0')
    .filter((path) => path !== '');
}

// Every path in the committed tree at HEAD.
export function listHeadPaths(cwd: string): string[] {
  return runGit(cwd, ['ls-tree', '-r', '--name-only', 'HEAD'])
    .split('\n')
    .filter((path) => path !== '');
}

// A file as committed at HEAD, not as changed in the working tree.
export function readHeadFile(cwd: string, path: string): string {
  return runGit(cwd, ['show', `HEAD:${path}`]);
}
