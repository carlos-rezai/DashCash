// A Pinned action is a remote action named by its full 40-character commit
// SHA with its release as a trailing `# v…` comment. A local `./…` action
// needs no pin.

const USES_LINE = /^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/;
const PINNED_REFERENCE = /^[^/\s@]+\/[^@\s]+@[0-9a-f]{40}$/;
const RELEASE_COMMENT = /^\s+#\s*v\d/;

export function findUnpinnedUses(workflow: string): string[] {
  const unpinned: string[] = [];

  for (const line of workflow.split(/\r?\n/)) {
    const match = USES_LINE.exec(line);
    if (match === null) continue;

    const reference = match[1] ?? '';
    const rest = match[2] ?? '';
    if (reference.startsWith('./')) continue;

    if (!PINNED_REFERENCE.test(reference) || !RELEASE_COMMENT.test(rest)) {
      unpinned.push(reference);
    }
  }

  return unpinned;
}
