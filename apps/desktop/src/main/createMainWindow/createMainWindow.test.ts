import { describe, expect, it } from 'vitest';
import {
  createFakeElectron,
  type WorkArea,
} from '../test-support/fakeElectron/fakeElectron.ts';
import { createMainWindow, fitWindowSize } from './createMainWindow.ts';

// The App build's page, served through the App protocol (design log Q16).
const APP_INDEX_URL = 'app://dashcash/index.html';
const DEV_URL = 'http://localhost:5173';
const LARGE_WORK_AREA: WorkArea = { x: 0, y: 0, width: 2560, height: 1400 };
const PRELOAD_PATH = '/invented/dashcash-app/out/preload/preload.cjs';

// The Secure defaults' web preferences, exactly those of design log Q15.
const SECURE_WEB_PREFERENCES = {
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  spellcheck: false,
};

function create(devServerUrl?: string, workArea: WorkArea = LARGE_WORK_AREA) {
  const fake = createFakeElectron();
  const window = createMainWindow(fake.electron.BrowserWindow, {
    devServerUrl,
    workArea,
    preloadPath: PRELOAD_PATH,
  });
  return { fake, window };
}

describe('fitWindowSize', () => {
  it.each([
    {
      case: 'a larger work area',
      workArea: { width: 2560, height: 1400 },
      size: { width: 1440, height: 900 },
    },
    {
      case: 'an equal work area',
      workArea: { width: 1440, height: 900 },
      size: { width: 1440, height: 900 },
    },
    {
      case: 'a narrower work area, capping only the width',
      workArea: { width: 1280, height: 1000 },
      size: { width: 1280, height: 900 },
    },
    {
      case: 'a lower work area, capping only the height',
      workArea: { width: 1600, height: 768 },
      size: { width: 1440, height: 768 },
    },
    {
      case: 'a work area smaller on both sides, capping each',
      workArea: { width: 1024, height: 700 },
      size: { width: 1024, height: 700 },
    },
  ])('returns $size.width × $size.height for $case', ({ workArea, size }) => {
    expect(fitWindowSize(workArea)).toEqual(size);
  });
});

describe('createMainWindow', () => {
  it('creates exactly one window and returns it', () => {
    const { fake, window } = create();

    expect(fake.windows).toHaveLength(1);
    expect(window).toBe(fake.windows[0]);
  });

  it('titles the window "DashCash"', () => {
    const { window } = create();

    expect(window.getTitle()).toBe('DashCash');
  });

  it('keeps the window hidden until ready-to-show', () => {
    const { window } = create();

    expect(window.isVisible()).toBe(false);
  });

  it('shows the window on ready-to-show', () => {
    const { fake } = create();
    const [window] = fake.windows;

    window?.emitReadyToShow();

    expect(window?.isVisible()).toBe(true);
  });

  it('loads app://dashcash/index.html, and nothing else, without a dev server', () => {
    const { window } = create(undefined);

    expect(window.pageLoads()).toEqual([{ kind: 'url', url: APP_INDEX_URL }]);
  });

  it('loads the dev server URL, and nothing else, in dev', () => {
    const { window } = create(DEV_URL);

    expect(window.pageLoads()).toEqual([{ kind: 'url', url: DEV_URL }]);
  });

  it.each([
    {
      case: 'a larger work area',
      workArea: LARGE_WORK_AREA,
      size: { width: 1440, height: 900 },
    },
    {
      case: 'a smaller work area',
      workArea: { x: 0, y: 25, width: 1280, height: 775 },
      size: { width: 1280, height: 775 },
    },
  ])(
    'sizes the content $size.width × $size.height for $case',
    ({ workArea, size }) => {
      const { window } = create(undefined, workArea);

      expect(window.options).toMatchObject({ ...size, useContentSize: true });
    },
  );

  it.each(Object.entries(SECURE_WEB_PREFERENCES))(
    'sets the web preference %s to %s',
    (name, value) => {
      const { window } = create();

      expect(window.options).toHaveProperty(['webPreferences', name], value);
    },
  );

  it('loads the preload it is given, with the sandbox on', () => {
    const { window } = create();

    expect(window.options.webPreferences).toMatchObject({
      preload: PRELOAD_PATH,
      sandbox: true,
    });
  });

  it('sets exactly the web preferences of the Secure defaults and the preload', () => {
    const { window } = create();

    expect(window.options.webPreferences).toEqual({
      ...SECURE_WEB_PREFERENCES,
      preload: PRELOAD_PATH,
    });
  });

  it('leaves the menu alone', () => {
    const { fake } = create();

    expect(fake.menuChanges).toEqual([]);
  });
});
