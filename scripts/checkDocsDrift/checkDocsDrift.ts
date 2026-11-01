import { readFileSync } from 'node:fs';
import { posix } from 'node:path';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';
import { listTrackedPaths } from '../runGit/runGit.ts';

export type Doc = { path: string; text: string };

const TOP_LEVEL_FOLDERS = [
  '.claude/',
  '.github/',
  'apps/',
  'packages/',
  'e2e/',
  'fixtures/',
  'gates/',
  'quality/',
  'scripts/',
  'docs/',
];
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const LINK = /\]\(\s*([^)\s]+)[^)]*\)/g;
const INLINE_CODE = /`([^`\n]+)`/g;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const PLACEHOLDER = /[<>*{…\s]/;
const MISSING_REASON = 'path does not exist';

// Returns the doc's lines outside fenced code blocks.
function linesOutsideFences(text: string): string[] {
  const lines: string[] = [];
  let fence: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    const marker = FENCE.exec(line)?.[1];
    if (fence === undefined) {
      if (marker === undefined) {
        lines.push(line);
      } else {
        fence = marker;
      }
    } else if (
      marker !== undefined &&
      marker[0] === fence[0] &&
      marker.length >= fence.length
    ) {
      fence = undefined;
    }
  }
  return lines;
}

// A path a doc names: as written (an #anchor and a query dropped) and
// resolved from the repository root.
type NamedPath = { written: string; resolved: string };

// Names the path of a link target, resolved from the linking file's folder;
// undefined when the target is not a checkable path.
function nameLink(docPath: string, target: string): NamedPath | undefined {
  if (URL_SCHEME.test(target) || PLACEHOLDER.test(target)) {
    return undefined;
  }
  const withoutAnchor = target.split('#')[0] ?? '';
  const written = withoutAnchor.split('?')[0] ?? '';
  if (written === '') {
    return undefined;
  }
  const resolved = posix.normalize(posix.join(posix.dirname(docPath), written));
  return { written, resolved };
}

// Names the path of an inline-code span, resolved from the root; undefined
// when it is not a path under a top-level folder.
function nameSpan(span: string): NamedPath | undefined {
  if (
    PLACEHOLDER.test(span) ||
    !TOP_LEVEL_FOLDERS.some((folder) => span.startsWith(folder))
  ) {
    return undefined;
  }
  return { written: span, resolved: posix.normalize(span) };
}

function namedPaths(doc: Doc): NamedPath[] {
  const named: NamedPath[] = [];
  for (const line of linesOutsideFences(doc.text)) {
    for (const match of line.matchAll(LINK)) {
      const path = nameLink(doc.path, match[1] ?? '');
      if (path !== undefined) {
        named.push(path);
      }
    }
    for (const match of line.matchAll(INLINE_CODE)) {
      const path = nameSpan(match[1] ?? '');
      if (path !== undefined) {
        named.push(path);
      }
    }
  }
  return named;
}

// Returns one violation per path a doc names that git does not track, as a
// file or as a folder holding a tracked file.
export function findDocsDrift(
  docs: readonly Doc[],
  trackedPaths: readonly string[],
): Violation[] {
  const tracked = new Set(trackedPaths);
  const folders = new Set<string>();
  for (const path of trackedPaths) {
    for (
      let folder = posix.dirname(path);
      folder !== '.' && !folders.has(folder);
      folder = posix.dirname(folder)
    ) {
      folders.add(folder);
    }
  }

  const violations: Violation[] = [];
  for (const doc of docs) {
    const reported = new Set<string>();
    for (const { written, resolved } of namedPaths(doc)) {
      const path = resolved.replace(/\/+$/, '');
      if (!reported.has(path) && !tracked.has(path) && !folders.has(path)) {
        reported.add(path);
        violations.push({
          subject: `${doc.path}: ${written}`,
          reason: MISSING_REASON,
        });
      }
    }
  }
  return violations;
}

function isCheckedDoc(path: string): boolean {
  return (
    path === 'README.md' ||
    path === 'CLAUDE.md' ||
    /^docs\/[^/]+\.md$/.test(path)
  );
}

if (import.meta.main) {
  await runGate(() => {
    const trackedPaths = listTrackedPaths(process.cwd());
    const docs: Doc[] = trackedPaths
      .filter(isCheckedDoc)
      .map((path) => ({ path, text: readFileSync(path, 'utf8') }));
    return findDocsDrift(docs, trackedPaths);
  });
}
