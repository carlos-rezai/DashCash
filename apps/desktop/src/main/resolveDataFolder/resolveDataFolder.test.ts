import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveDataFolder } from './resolveDataFolder.ts';

// Electron's `userData` for the app DashCash (design log Q28).
const USER_DATA = resolve('/invented', 'AppData', 'Roaming', 'DashCash');

// An absolute override, as the App fixture passes it (Q29).
const OVERRIDE = resolve('/invented', 'dashcash-data');

// The cause of a relative override (A4, A5).
const RELATIVE_CAUSE = 'DASHCASH_DATA_FOLDER must be an absolute path.';

describe('resolveDataFolder', () => {
  it.each([
    { case: 'unset', env: {} },
    { case: 'undefined', env: { DASHCASH_DATA_FOLDER: undefined } },
    { case: 'empty', env: { DASHCASH_DATA_FOLDER: '' } },
  ])(
    'gives userData, not overridden, when DASHCASH_DATA_FOLDER is $case',
    ({ env }) => {
      expect(resolveDataFolder(env, USER_DATA)).toStrictEqual({
        folder: USER_DATA,
        overridden: false,
      });
    },
  );

  it('gives an absolute DASHCASH_DATA_FOLDER as the Data folder, overridden', () => {
    expect(
      resolveDataFolder({ DASHCASH_DATA_FOLDER: OVERRIDE }, USER_DATA),
    ).toStrictEqual({ folder: OVERRIDE, overridden: true });
  });

  it.each([
    'invented-data',
    join('.', 'invented-data'),
    join('..', 'invented-data', 'nested'),
  ])(
    'gives the cause "DASHCASH_DATA_FOLDER must be an absolute path." for the relative %s',
    (relative) => {
      expect(
        resolveDataFolder({ DASHCASH_DATA_FOLDER: relative }, USER_DATA),
      ).toStrictEqual({ cause: RELATIVE_CAUSE });
    },
  );

  it('reads no other variable', () => {
    expect(
      resolveDataFolder(
        { DASHCASH_DATA: OVERRIDE, APPDATA: OVERRIDE, HOME: OVERRIDE },
        USER_DATA,
      ),
    ).toStrictEqual({ folder: USER_DATA, overridden: false });
  });
});
