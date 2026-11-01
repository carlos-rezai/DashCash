import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The repository root, where package.json, scripts/ and node_modules live.
export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// Environment without the GIT_* variables a git hook sets, so commands act on
// the sample repository only, and without the pull-request variables of the
// CI run that executes the tests; each test sets its own through extra, which
// is applied last.
export function buildCleanEnv(
  extra: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.startsWith('GIT_') && key !== 'PR_TITLE',
    ),
  );
  return { ...env, GITHUB_HEAD_REF: '', GITHUB_REF_NAME: '', ...extra };
}

// Runs git in the folder and returns its trimmed standard output; a failure
// throws with git's standard error.
export function runSampleGit(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: buildCleanEnv(),
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

// Writes one file under the folder, creating its parent folders.
export function writeTreeFile(
  cwd: string,
  file: string,
  content: string,
): void {
  const path = join(cwd, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// Commits without changes and returns the new commit's hash. Each paragraph
// becomes its own -m, so a second one is the body.
export function commit(cwd: string, ...paragraphs: string[]): string {
  runSampleGit(
    cwd,
    'commit',
    '--allow-empty',
    '--quiet',
    ...paragraphs.flatMap((paragraph) => ['-m', paragraph]),
  );
  return runSampleGit(cwd, 'rev-parse', 'HEAD');
}

// Writes the files and commits them, and only them.
export function commitFiles(
  cwd: string,
  message: string,
  files: Record<string, string>,
): void {
  for (const [file, content] of Object.entries(files)) {
    writeTreeFile(cwd, file, content);
  }
  runSampleGit(cwd, 'add', '--', ...Object.keys(files));
  runSampleGit(cwd, 'commit', '--quiet', '-m', message);
}

// A fake origin/main: a remote-tracking ref set by hand, no remote needed.
export function setOriginMain(cwd: string): void {
  runSampleGit(cwd, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
}

// A repository on main with the sample author, no signing and no hooks.
export function initSampleRepository(cwd: string): void {
  runSampleGit(cwd, 'init', '--quiet', '--initial-branch=main');
  runSampleGit(cwd, 'config', 'user.name', 'Sample Author');
  runSampleGit(cwd, 'config', 'user.email', 'author@example.invalid');
  runSampleGit(cwd, 'config', 'commit.gpgsign', 'false');
  runSampleGit(cwd, 'config', 'core.hooksPath', 'no-hooks');
}

// Places this repository's gate scripts, commitlint config and installed
// packages beside a sample repository, all untracked. node_modules is a link,
// which removing the folder deletes without following.
export function installGateScripts(cwd: string): void {
  symlinkSync(
    join(ROOT, 'node_modules'),
    join(cwd, 'node_modules'),
    'junction',
  );
  writeFileSync(join(cwd, 'package.json'), '{ "type": "module" }\n');
  cpSync(join(ROOT, 'scripts'), join(cwd, 'scripts'), { recursive: true });
  cpSync(join(ROOT, 'commitlint.config.js'), join(cwd, 'commitlint.config.js'));
}
