import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createFakeElectron,
  type FakeElectronOptions,
} from '../test-support/fakeElectron/fakeElectron.ts';
import { startApp } from './startApp.ts';

const APP_PATH = join('/invented', 'dashcash-app');
const DEV_URL = 'http://localhost:5173';

// The build's page: electron-vite writes the renderer to out/renderer/ in the
// desktop member, whose folder is the app path.
const BUILT_INDEX = join(APP_PATH, 'out', 'renderer', 'index.html');

function start(
  options: FakeElectronOptions = {},
  env: Record<string, string | undefined> = {},
) {
  const fake = createFakeElectron({ appPath: APP_PATH, ...options });
  startApp(fake.electron, env);
  return fake;
}

describe('startApp', () => {
  it('creates no window before the app is ready', () => {
    const fake = start();

    expect(fake.windows).toHaveLength(0);
  });

  it('creates one window titled "DashCash" when the app is ready', async () => {
    const fake = start();

    await fake.ready();

    expect(fake.windows.map((window) => window.getTitle())).toEqual([
      'DashCash',
    ]);
  });

  it('keeps the window hidden until ready-to-show, then shows it', async () => {
    const fake = start();
    await fake.ready();
    const [window] = fake.windows;

    expect(window?.isVisible()).toBe(false);

    window?.emitReadyToShow();

    expect(window?.isVisible()).toBe(true);
  });

  it.each([
    {
      case: 'packaged, even with ELECTRON_RENDERER_URL set',
      isPackaged: true,
      env: { ELECTRON_RENDERER_URL: DEV_URL },
    },
    {
      case: 'not packaged without ELECTRON_RENDERER_URL',
      isPackaged: false,
      env: {},
    },
  ])("loads the build's page when $case", async ({ isPackaged, env }) => {
    const fake = start({ isPackaged }, env);

    await fake.ready();

    expect(fake.windows[0]?.loadedPage()).toEqual({
      kind: 'file',
      path: BUILT_INDEX,
    });
  });

  it('loads the dev server URL when not packaged with ELECTRON_RENDERER_URL set', async () => {
    const fake = start(
      { isPackaged: false },
      { ELECTRON_RENDERER_URL: DEV_URL },
    );

    await fake.ready();

    expect(fake.windows[0]?.loadedPage()).toEqual({
      kind: 'url',
      url: DEV_URL,
    });
  });

  it('does not quit while a window is open', async () => {
    const fake = start();

    await fake.ready();

    expect(fake.quitCount()).toBe(0);
  });

  it('quits when all windows are closed', async () => {
    const fake = start();
    await fake.ready();

    fake.windows[0]?.close();

    expect(fake.quitCount()).toBe(1);
  });

  it("keeps Electron's default menu", async () => {
    const fake = start();

    await fake.ready();

    expect(fake.menuChanges).toEqual([]);
  });
});
