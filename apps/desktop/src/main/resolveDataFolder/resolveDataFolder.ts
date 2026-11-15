import { isAbsolute } from 'node:path';

const OVERRIDE_VARIABLE = 'DASHCASH_DATA_FOLDER';

export type DataFolder = { folder: string; overridden: boolean };

export type DataFolderFailure = { cause: string };

// The Data folder (design log Q28, Q29): `userData` unless the variable
// DASHCASH_DATA_FOLDER names another absolute path, in every build. A relative
// path is no Data folder, only a cause (A4).
export function resolveDataFolder(
  env: Readonly<Record<string, string | undefined>>,
  userData: string,
): DataFolder | DataFolderFailure {
  const override = env[OVERRIDE_VARIABLE];
  if (override === undefined || override === '') {
    return { folder: userData, overridden: false };
  }
  if (!isAbsolute(override)) {
    return { cause: `${OVERRIDE_VARIABLE} must be an absolute path.` };
  }
  return { folder: override, overridden: true };
}
