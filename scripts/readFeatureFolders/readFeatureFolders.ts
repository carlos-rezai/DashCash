export const FEATURES_FOLDER = 'docs/features';

const FEATURE_BRANCH = /^(feat|refactor)\/(\d+-(.+))$/;
const NUMBERED_FOLDER = /^\d+-(.+)$/;

export type FeatureBranch = {
  kind: 'feat' | 'refactor';
  // The Feature folder name, `<nn>-<feature>`.
  folder: string;
  feature: string;
};

// The Feature a `feat/<nn>-<feature>` or `refactor/<nn>-<feature>` branch
// belongs to; undefined for any other branch.
export function parseFeatureBranch(
  branch: string | undefined,
): FeatureBranch | undefined {
  const match = FEATURE_BRANCH.exec(branch ?? '');
  if (match === null) {
    return undefined;
  }
  const [, kind = '', folder = '', feature = ''] = match;
  return { kind: kind === 'feat' ? 'feat' : 'refactor', folder, feature };
}

// The repository path of a Feature folder, from its name.
export function buildFeatureFolderPath(folder: string): string {
  return `${FEATURES_FOLDER}/${folder}`;
}

// The Feature folder (`<nn>-<feature>`) of a feature name, if one is tracked.
export function findFeatureFolder(
  feature: string,
  trackedPaths: readonly string[],
): string | undefined {
  for (const path of trackedPaths) {
    if (!path.startsWith(`${FEATURES_FOLDER}/`)) {
      continue;
    }
    const folder = path.slice(FEATURES_FOLDER.length + 1).split('/')[0] ?? '';
    if (NUMBERED_FOLDER.exec(folder)?.[1] === feature) {
      return folder;
    }
  }
  return undefined;
}
