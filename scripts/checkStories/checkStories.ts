import { runGit } from '../runGit/runGit.ts';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';

// <Name>/<Name>.tsx with a PascalCase <Name>, directly under primitives/,
// components/ or features/<feature>/ of the renderer.
const COMPONENT_FILE =
  /^apps\/desktop\/src\/renderer\/(?:primitives|components|features\/[^/]+)\/([A-Z][A-Za-z0-9]*)\/\1\.tsx$/;

// Returns one violation for every component whose stories file is not in
// the list.
export function findMissingStories(paths: readonly string[]): Violation[] {
  const present = new Set(paths);
  const violations: Violation[] = [];
  for (const path of paths) {
    const name = COMPONENT_FILE.exec(path)?.[1];
    if (name === undefined) {
      continue;
    }
    const stories = `${name}.stories.tsx`;
    const storiesPath = `${path.slice(0, path.lastIndexOf('/') + 1)}${stories}`;
    if (!present.has(storiesPath)) {
      violations.push({ subject: path, reason: `has no ${stories}` });
    }
  }
  return violations;
}

// Every tracked path and every untracked path that is not ignored.
function listCandidatePaths(cwd: string): string[] {
  return runGit(cwd, [
    'ls-files',
    '-z',
    '--cached',
    '--others',
    '--exclude-standard',
  ])
    .split('\0')
    .filter((path) => path !== '');
}

if (import.meta.main) {
  await runGate(() => findMissingStories(listCandidatePaths(process.cwd())));
}
