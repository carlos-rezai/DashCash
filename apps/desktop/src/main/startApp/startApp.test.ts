import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createFakeElectron,
  type FakeElectronOptions,
} from '../test-support/fakeElectron/fakeElectron.ts';
import { startApp } from './startApp.ts';

const APP_PATH = join('/invented', 'dashcash-app');
const DEV_URL = 'http://localhost:5173';

// The build's page, served through the App protocol (design log Q16).
const APP_INDEX_URL = 'app://dashcash/index.html';

// The App build's preload: one CommonJS file (A2).
const PRELOAD_PATH = join(APP_PATH, 'out', 'preload', 'preload.cjs');

// The title of the Startup error (Q34, A5).
const STARTUP_ERROR_TITLE = "DashCash couldn't start";

// A temporary folder holding every Data folder the tests create, so no test
// touches a real `userData`.
let dataRoot = '';
let folderCount = 0;

beforeAll(() => {
  dataRoot = mkdtempSync(join(tmpdir(), 'dashcash-data-folder-'));
});

afterAll(() => {
  rmSync(dataRoot, { recursive: true, force: true });
});

// A path in the temporary folder that nothing has used yet.
function freshPath(name: string): string {
  folderCount += 1;
  return join(dataRoot, `${name}-${String(folderCount)}`);
}

function isFolder(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

// The message Node gives when creating `folder` fails.
function readCreateFailure(folder: string): string {
  try {
    mkdirSync(folder, { recursive: true });
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error(`Creating ${folder} was expected to fail`);
}

function start(
  options: FakeElectronOptions = {},
  env: Record<string, string | undefined> = {},
) {
  const fake = createFakeElectron({
    appPath: APP_PATH,
    userData: freshPath('user-data'),
    ...options,
  });
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

  it("gives the window the web preferences of the Secure defaults and the App build's preload", async () => {
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
      preload: PRELOAD_PATH,
    });
  });

  it('registers one IPC handler per Channel when the app is ready, none before', async () => {
    const fake = start();

    expect(fake.ipcHandlers).toEqual([]);

    await fake.ready();

    expect(fake.ipcHandlers).toEqual([
      { channel: 'app:info', when: 'after-ready' },
    ]);
  });

  it("answers the page's app:info with the App version, ignoring what the page sends", async () => {
    const fake = start({ version: '4.5.6-invented' });
    await fake.ready();

    await expect(fake.invoke('app:info')).resolves.toStrictEqual({
      version: '4.5.6-invented',
    });
    await expect(
      fake.invoke('app:info', { version: '6.6.6-forged' }),
    ).resolves.toStrictEqual({ version: '4.5.6-invented' });
  });

  describe('Sender check', () => {
    const devFrame = { url: `${DEV_URL}/index.html`, origin: DEV_URL };
    const otherPortFrame = {
      url: 'http://localhost:5174/index.html',
      origin: 'http://localhost:5174',
    };

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
      "refuses app:info from the dev server's origin when $case",
      async ({ isPackaged, env }) => {
        const fake = start({ isPackaged }, env);
        await fake.ready();

        await expect(fake.invokeFrom(devFrame, 'app:info')).rejects.toThrow(
          /Error: Refused app:info from http:\/\/localhost:5173$/,
        );
      },
    );

    it("answers app:info from the dev server's origin when not packaged with ELECTRON_RENDERER_URL set, and refuses another origin", async () => {
      const fake = start(
        { isPackaged: false, version: '4.5.6-invented' },
        { ELECTRON_RENDERER_URL: DEV_URL },
      );
      await fake.ready();

      await expect(fake.invokeFrom(devFrame, 'app:info')).resolves.toEqual({
        version: '4.5.6-invented',
      });
      await expect(fake.invokeFrom(otherPortFrame, 'app:info')).rejects.toThrow(
        /Error: Refused app:info from http:\/\/localhost:5174$/,
      );
    });

    it('refuses app:info from a missing frame', async () => {
      const fake = start({ isPackaged: true });
      await fake.ready();

      await expect(fake.invokeFrom(null, 'app:info')).rejects.toThrow(
        /Error: Refused app:info from .+$/,
      );
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

    expect(fake.startupCalls).toEqual([
      'app.enableSandbox',
      'protocol.registerSchemesAsPrivileged',
    ]);

    await fake.ready();

    // The protocol handler, then the session's permission handlers (in
    // either order), then the IPC handlers, then the window.
    const calls = fake.startupCalls;
    expect(calls.slice(0, 4)).toEqual([
      'app.enableSandbox',
      'protocol.registerSchemesAsPrivileged',
      'ready',
      'protocol.handle',
    ]);
    expect([...calls.slice(4, 6)].sort()).toEqual([
      'session.setPermissionCheckHandler',
      'session.setPermissionRequestHandler',
    ]);
    expect(calls.slice(6)).toEqual(['ipcMain.handle', 'new BrowserWindow']);
  });

  describe('session hardening', () => {
    it.each([
      'https://example.com/',
      'file:///C:/invented/index.html',
      'app://dashcash.evil/index.html',
      'app://evil-dashcash/index.html',
    ])(
      'keeps the main window on app://dashcash: allows same-origin navigation, prevents navigating or redirecting to %s',
      async (url) => {
        const fake = start({ isPackaged: true });
        await fake.ready();
        const contents = fake.windows[0]?.webContents;

        expect(contents?.navigate(url)).toBe('prevented');
        expect(contents?.redirect(url)).toBe('prevented');
        expect(contents?.navigate('app://dashcash/other.html')).toBe('allowed');
        expect(contents?.redirect('app://dashcash/index.html')).toBe('allowed');
      },
    );

    it.each([
      {
        case: 'packaged, even with ELECTRON_RENDERER_URL set',
        isPackaged: true,
        env: { ELECTRON_RENDERER_URL: DEV_URL },
        outcome: 'prevented',
      },
      {
        case: 'not packaged without ELECTRON_RENDERER_URL',
        isPackaged: false,
        env: {},
        outcome: 'prevented',
      },
      {
        case: 'not packaged with ELECTRON_RENDERER_URL set',
        isPackaged: false,
        env: { ELECTRON_RENDERER_URL: DEV_URL },
        outcome: 'allowed',
      },
    ])(
      "navigation to the dev server's origin is $outcome when $case, and to another origin prevented",
      async ({ isPackaged, env, outcome }) => {
        const fake = start({ isPackaged }, env);
        await fake.ready();
        const contents = fake.windows[0]?.webContents;

        expect(contents?.navigate('http://localhost:5174/')).toBe('prevented');
        expect(contents?.navigate(`${DEV_URL}/index.html`)).toBe(outcome);
      },
    );

    it('denies every window open from the main window', async () => {
      const fake = start();
      await fake.ready();
      const contents = fake.windows[0]?.webContents;

      expect(contents?.openWindow('app://dashcash/index.html')).toEqual({
        action: 'deny',
      });
      expect(contents?.openWindow('https://example.com/')).toEqual({
        action: 'deny',
      });
    });

    it('prevents a webview in the main window', async () => {
      const fake = start();
      await fake.ready();
      const contents = fake.windows[0]?.webContents;

      expect(contents?.attachWebview('https://example.com/')).toBe('prevented');
    });

    it('denies every permission request and check of the session', async () => {
      const fake = start();
      await fake.ready();
      const contents = fake.windows[0]?.webContents;

      await expect(
        fake.requestPermission('media', APP_INDEX_URL, contents),
      ).resolves.toBe(false);
      expect(fake.checkPermission('media', 'app://dashcash', contents)).toBe(
        false,
      );
    });
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

  describe('Data folder', () => {
    it.each([
      { case: 'unset', env: {} },
      { case: 'empty', env: { DASHCASH_DATA_FOLDER: '' } },
    ])(
      'leaves userData where it is and creates it when the app is ready, with DASHCASH_DATA_FOLDER $case',
      async ({ env }) => {
        const userData = freshPath('user-data');
        const fake = start({ userData }, env);

        expect(fake.pathChanges).toEqual([]);
        expect(existsSync(userData)).toBe(false);

        await fake.ready();

        expect(fake.pathChanges).toEqual([]);
        expect(isFolder(userData)).toBe(true);
        expect(fake.errorBoxes).toEqual([]);
        expect(fake.windows).toHaveLength(1);
      },
    );

    it('sets userData to an absolute DASHCASH_DATA_FOLDER first of all, once, before the app is ready', async () => {
      const folder = freshPath('data');
      const fake = start({}, { DASHCASH_DATA_FOLDER: folder });

      expect(fake.pathChanges).toEqual([
        { name: 'userData', path: folder, when: 'before-ready' },
      ]);
      expect(fake.startupCalls[0]).toBe('app.setPath');
      expect(fake.app.getPath('userData')).toBe(folder);

      await fake.ready();

      expect(fake.pathChanges).toHaveLength(1);
    });

    it('creates a missing Data folder, its parents included, when the app is ready, then opens the window', async () => {
      const folder = join(freshPath('parent'), 'nested', 'data');
      const fake = start({}, { DASHCASH_DATA_FOLDER: folder });

      expect(existsSync(folder)).toBe(false);

      await fake.ready();

      expect(isFolder(folder)).toBe(true);
      expect(fake.errorBoxes).toEqual([]);
      expect(fake.windows).toHaveLength(1);
    });

    it('keeps an existing Data folder and what it holds', async () => {
      const folder = freshPath('data');
      mkdirSync(folder);
      const kept = join(folder, 'invented-kept.txt');
      writeFileSync(kept, 'invented content');
      const fake = start({}, { DASHCASH_DATA_FOLDER: folder });

      await fake.ready();

      expect(readFileSync(kept, 'utf8')).toBe('invented content');
      expect(fake.errorBoxes).toEqual([]);
      expect(fake.windows).toHaveLength(1);
    });

    it('ends a relative DASHCASH_DATA_FOLDER in the Startup error before the app is ready, and creates no window', async () => {
      const relative = join('invented-relative', 'data');
      const fake = start({}, { DASHCASH_DATA_FOLDER: relative });

      expect(fake.errorBoxes).toEqual([
        {
          title: STARTUP_ERROR_TITLE,
          content: `DASHCASH_DATA_FOLDER must be an absolute path.\n\nData folder: ${relative}`,
          quitsBefore: 0,
        },
      ]);
      expect(fake.quitCount()).toBe(1);
      expect(fake.pathChanges).toEqual([]);

      await fake.ready();

      expect(fake.errorBoxes).toHaveLength(1);
      expect(fake.windows).toEqual([]);
      expect(fake.ipcHandlers).toEqual([]);
      expect(fake.protocolHandlers).toEqual([]);
      expect(existsSync(resolve('invented-relative'))).toBe(false);
    });

    it('ends a Data folder that cannot be created in the Startup error with its cause, and creates no window', async () => {
      // A file where the Data folder's parent should be.
      const blocker = freshPath('blocker');
      writeFileSync(blocker, 'invented, not a folder');
      const folder = join(blocker, 'data');
      const cause = readCreateFailure(folder);
      const fake = start({}, { DASHCASH_DATA_FOLDER: folder });

      await fake.ready();

      expect(fake.errorBoxes).toEqual([
        {
          title: STARTUP_ERROR_TITLE,
          content: `${cause}\n\nData folder: ${folder}`,
          quitsBefore: 0,
        },
      ]);
      expect(fake.quitCount()).toBe(1);
      expect(fake.windows).toEqual([]);
      expect(fake.ipcHandlers).toEqual([]);
      expect(fake.protocolHandlers).toEqual([]);
    });
  });
});
