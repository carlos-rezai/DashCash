import type { ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, relative } from 'node:path';
import type { DashCashBridge } from '@dashcash/contract';
import { expect, test } from './test-support/appFixture/appFixture.ts';

// The desktop member's manifest, whose version is the App version.
const DESKTOP_MANIFEST = new URL(
  '../apps/desktop/package.json',
  import.meta.url,
);

// The App build's preload: one CommonJS file with the Contract bundled (A2).
const BUILT_PRELOAD = new URL(
  '../apps/desktop/out/preload/preload.cjs',
  import.meta.url,
);

// The User flow "Start the app" (design log Q40): on a fresh Data folder the
// App build opens exactly one window, titled "DashCash", with context
// isolation and the sandbox on, Node integration off, and no `require` or
// `process` in the page. Later tickets add their facts to this one test.
//
// The App fixture has no test of its own (design log Q39): this flow checks
// what it promises. During the test the app runs on its own Data folder, a
// fresh temporary folder passed as DASHCASH_DATA_FOLDER, and without
// ELECTRON_RENDERER_URL, so the App build is driven, never the dev server.
// After the test the fixture has closed the app and deleted the folder; the
// afterAll hook runs once the test's fixtures are torn down and checks both.

// The worker is given a dev server address, so the check below fails whenever
// the fixture passes ELECTRON_RENDERER_URL through to the app.
process.env.ELECTRON_RENDERER_URL = 'http://localhost:5173';

type Launch = { dataFolder: string; appProcess: ChildProcess };

let launch: Launch | undefined;

test.afterAll(() => {
  expect(launch, 'Start the app recorded its launch').toBeDefined();
  if (launch === undefined) {
    return;
  }
  const { dataFolder, appProcess } = launch;

  expect(
    appProcess.exitCode !== null || appProcess.signalCode !== null,
    'the app is closed after the test',
  ).toBe(true);
  expect(existsSync(dataFolder), 'the Data folder is deleted').toBe(false);
});

test('Start the app', async ({ app, window }) => {
  const dataFolder = await app.evaluate(() => process.env.DASHCASH_DATA_FOLDER);
  const rendererUrl = await app.evaluate(
    () => process.env.ELECTRON_RENDERER_URL,
  );
  expect(dataFolder, 'DASHCASH_DATA_FOLDER is set').toBeDefined();
  if (dataFolder === undefined) {
    return;
  }
  launch = { dataFolder, appProcess: app.process() };

  const fromTemp = relative(tmpdir(), dataFolder);
  expect(
    fromTemp !== '' && !fromTemp.startsWith('..') && !isAbsolute(fromTemp),
    `the Data folder ${dataFolder} lies inside ${tmpdir()}`,
  ).toBe(true);
  expect(statSync(dataFolder).isDirectory()).toBe(true);
  expect(rendererUrl).toBeUndefined();

  const titles = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((browserWindow) =>
      browserWindow.getTitle(),
    ),
  );
  expect(titles).toEqual(['DashCash']);
  expect(app.windows()).toHaveLength(1);
  await expect(window).toHaveTitle('DashCash');

  // The App build serves its page through the App protocol, not file://
  // (design log Q16); the path check and the 404 stay in Vitest (Q41).
  expect(window.url()).toBe('app://dashcash/index.html');

  // The Secure defaults (design log Q15), as the window's web contents report
  // them in main. Electron enables these by default, so they guard against a
  // later loosening (I5).
  const webPreferences = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map((browserWindow) => {
      // Not in Electron's typings, but present on every web contents.
      const webContents = browserWindow.webContents as unknown as {
        getLastWebPreferences(): Record<string, unknown> | null;
      };
      const preferences = webContents.getLastWebPreferences();
      return {
        contextIsolation: preferences?.contextIsolation,
        sandbox: preferences?.sandbox,
        nodeIntegration: preferences?.nodeIntegration,
      };
    }),
  );
  expect(webPreferences).toEqual([
    { contextIsolation: true, sandbox: true, nodeIntegration: false },
  ]);

  const pageGlobals = await window.evaluate(() => ({
    require: typeof require,
    process: typeof process,
  }));
  expect(pageGlobals).toEqual({ require: 'undefined', process: 'undefined' });

  // The CSP (design log Q17, Q18): exactly one meta tag carrying exactly the
  // policy, and still no script in the page.
  const page = await window.evaluate(() => ({
    policies: Array.from(
      document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]'),
      (meta) => meta.getAttribute('content'),
    ),
    scripts: document.querySelectorAll('script').length,
  }));
  expect(page).toEqual({
    policies: [
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'",
    ],
    scripts: 0,
  });

  // The policy is in force, not just present: without 'unsafe-eval' in
  // script-src the page cannot turn a string into code, so any loosening that
  // allows it fails here. DevTools lets code evaluated through it generate
  // code from strings, so the eval waits one task and runs as the page's own.
  const evalOutcome = await window.evaluate(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    try {
      eval('void 0');
      return 'allowed';
    } catch (error) {
      return error instanceof EvalError ? 'blocked' : String(error);
    }
  });
  expect(evalOutcome, 'the CSP blocks eval in the page').toBe('blocked');

  // The Bridge (design log Q21, A2): the Preload exposes `dashcash` with
  // `invoke` and nothing else, never `ipcRenderer`. The sandbox is on (above),
  // so the page has a Bridge only if the preload is CommonJS and requires
  // nothing but electron.
  const exposed = await window.evaluate(() => {
    const dashcash: unknown = Reflect.get(window, 'dashcash');
    return {
      dashcash:
        typeof dashcash === 'object' && dashcash !== null
          ? Object.keys(dashcash)
          : typeof dashcash,
      ipcRenderer: 'ipcRenderer' in window,
      electron: 'electron' in window,
    };
  });
  expect(exposed).toEqual({
    dashcash: ['invoke'],
    ipcRenderer: false,
    electron: false,
  });

  expect(existsSync(BUILT_PRELOAD), 'the App build emits preload.cjs').toBe(
    true,
  );
  const preloadSource = readFileSync(BUILT_PRELOAD, 'utf8');
  const required = Array.from(
    preloadSource.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g),
    (match) => match[1],
  );
  expect(
    [...new Set(required)],
    'the preload requires only electron, with the Contract bundled',
  ).toEqual(['electron']);

  // The first Channel answers with the App version, read from the desktop
  // member's manifest, never a literal.
  const { version } = JSON.parse(readFileSync(DESKTOP_MANIFEST, 'utf8')) as {
    version: string;
  };
  const appInfo = await window.evaluate(() =>
    (window as unknown as { dashcash: DashCashBridge }).dashcash.invoke(
      'app:info',
      undefined,
    ),
  );
  expect(appInfo).toEqual({ version });
});
