import type { ChildProcess } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, relative } from 'node:path';
import { expect, test } from './test-support/appFixture/appFixture.ts';

// The User flow "Start the app" (design log Q40): on a fresh Data folder the
// App build opens exactly one window, titled "DashCash". Later tickets add
// their facts to this one test.
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
});
