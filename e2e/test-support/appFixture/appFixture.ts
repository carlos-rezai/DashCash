import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  _electron,
  test as base,
  type ElectronApplication,
  type Page,
} from '@playwright/test';

// The App fixture (design log Q38, P1): per test a fresh Data folder, passed
// to the App build as DASHCASH_DATA_FOLDER. The desktop member is launched
// through _electron.launch, which drives the Electron binary already
// installed (no browser is downloaded), with ELECTRON_RENDERER_URL removed
// so the App build is driven, never the dev server. The test gets the app and
// its first window; afterwards the app is closed and the folder deleted.

const DESKTOP_FOLDER = fileURLToPath(
  new URL('../../../apps/desktop', import.meta.url),
);

const DATA_FOLDER_PREFIX = 'dashcash-e2e-';

function appEnvironment(dataFolder: string): Record<string, string> {
  const environment: Record<string, string> = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined && name !== 'ELECTRON_RENDERER_URL') {
      environment[name] = value;
    }
  }
  environment.DASHCASH_DATA_FOLDER = dataFolder;
  return environment;
}

type AppFixtures = { app: ElectronApplication; window: Page };
type AppOptions = { desktopFolder: string };

export const test = base.extend<AppFixtures & AppOptions>({
  desktopFolder: [DESKTOP_FOLDER, { option: true }],
  app: async ({ desktopFolder }, use) => {
    const dataFolder = await mkdtemp(join(tmpdir(), DATA_FOLDER_PREFIX));
    try {
      const app = await _electron.launch({
        args: [desktopFolder],
        env: appEnvironment(dataFolder),
      });
      try {
        await use(app);
      } finally {
        await app.close();
      }
    } finally {
      await rm(dataFolder, { recursive: true, force: true });
    }
  },
  window: async ({ app }, use) => {
    await use(await app.firstWindow());
  },
});

export { expect } from '@playwright/test';
