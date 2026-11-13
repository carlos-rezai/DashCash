import { describe, expect, it } from 'vitest';
import { createFakeElectron } from '../test-support/fakeElectron/fakeElectron.ts';
import { createMainWindow } from './createMainWindow.ts';

const INDEX_FILE = '/invented/dashcash-app/out/renderer/index.html';
const DEV_URL = 'http://localhost:5173';

function create(devServerUrl?: string) {
  const fake = createFakeElectron();
  const window = createMainWindow(fake.electron.BrowserWindow, {
    indexFile: INDEX_FILE,
    devServerUrl,
  });
  return { fake, window };
}

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

  it("loads the build's index.html as a file without a dev server", () => {
    const { window } = create(undefined);

    expect(window.loadedPage()).toEqual({ kind: 'file', path: INDEX_FILE });
  });

  it('loads the dev server URL in dev', () => {
    const { window } = create(DEV_URL);

    expect(window.loadedPage()).toEqual({ kind: 'url', url: DEV_URL });
  });

  it('leaves the menu alone', () => {
    const { fake } = create();

    expect(fake.menuChanges).toEqual([]);
  });
});
