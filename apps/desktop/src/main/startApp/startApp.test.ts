import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createFakeElectron,
  type FakeElectronOptions,
} from '../test-support/fakeElectron/fakeElectron.ts';
import { startApp } from './startApp.ts';

const APP_PATH = join('/invented', 'dashcash-app');
const DEV_URL = 'http://localhost:5173';

// The build's page, served through the App protocol (design log Q16).
const APP_INDEX_URL = 'app://dashcash/index.html';

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

  it('enables the sandbox once, before the app is ready', async () => {
    const fake = start();

    expect(fake.sandboxCalls).toEqual(['before-ready']);

    await fake.ready();

    expect(fake.sandboxCalls).toEqual(['before-ready']);
  });

  it.each([
    {
      case: "a primary display's work area larger than 1440 × 900",
      workArea: { x: 0, y: 0, width: 2560, height: 1400 },
      size: { width: 1440, height: 900 },
    },
    {
      case: "a smaller primary display's work area",
      workArea: { x: 0, y: 25, width: 1366, height: 743 },
      size: { width: 1366, height: 743 },
    },
  ])(
    'sizes the window content $size.width × $size.height for $case',
    async ({ workArea, size }) => {
      const fake = start({ workArea });

      await fake.ready();

      expect(fake.windows[0]?.options).toMatchObject({
        ...size,
        useContentSize: true,
      });
    },
  );

  it('gives the window the web preferences of the Secure defaults', async () => {
    const fake = start();

    await fake.ready();

    expect(fake.windows[0]?.options.webPreferences).toEqual({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false,
    });
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
  ])(
    'loads app://dashcash/index.html, and nothing else, when $case',
    async ({ isPackaged, env }) => {
      const fake = start({ isPackaged }, env);

      await fake.ready();

      expect(fake.windows[0]?.pageLoads()).toEqual([
        { kind: 'url', url: APP_INDEX_URL },
      ]);
    },
  );

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

  it('registers the scheme app as privileged, standard and secure, once, before the app is ready', async () => {
    const fake = start();

    expect(fake.privilegedSchemes).toEqual([
      {
        when: 'before-ready',
        schemes: [
          {
            scheme: 'app',
            privileges: expect.objectContaining({
              standard: true,
              secure: true,
            }) as unknown,
          },
        ],
      },
    ]);

    await fake.ready();

    expect(fake.privilegedSchemes).toHaveLength(1);
  });

  it('registers the handler of the scheme app, once, when the app is ready', async () => {
    const fake = start();

    await fake.ready();

    expect(fake.protocolHandlers).toEqual([
      { scheme: 'app', when: 'after-ready' },
    ]);
  });

  it('follows the startup order of the design log', async () => {
    const fake = start();

    await fake.ready();

    expect(fake.startupCalls).toEqual([
      'app.enableSandbox',
      'protocol.registerSchemesAsPrivileged',
      'ready',
      'protocol.handle',
      'new BrowserWindow',
    ]);
  });

  it("serves the build's renderer folder through app://dashcash", async () => {
    // A temporary app path holding an invented built page.
    const appPath = mkdtempSync(join(tmpdir(), 'dashcash-start-app-'));
    try {
      const rendererFolder = join(appPath, 'out', 'renderer');
      mkdirSync(rendererFolder, { recursive: true });
      const page = '<!doctype html><title>Invented built page</title>';
      writeFileSync(join(rendererFolder, 'index.html'), page);
      const fake = start({ appPath, isPackaged: true });
      await fake.ready();

      const response = await fake.request(APP_INDEX_URL);

      expect(response?.status).toBe(200);
      expect(await response?.text()).toBe(page);
    } finally {
      rmSync(appPath, { recursive: true, force: true });
    }
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
