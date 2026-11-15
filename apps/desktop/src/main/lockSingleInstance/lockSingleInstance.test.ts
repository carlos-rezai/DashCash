import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createFakeElectron,
  type FakeBrowserWindow,
} from '../test-support/fakeElectron/fakeElectron.ts';
import { lockSingleInstance } from './lockSingleInstance.ts';

const USER_DATA = join('/invented', 'DashCash');

// A fake whose Single-instance lock is free, or held by another running app.
function createApp(lockHeldElsewhere: boolean) {
  return createFakeElectron({
    userData: USER_DATA,
    lockedFolders: lockHeldElsewhere ? [USER_DATA] : [],
  });
}

describe('lockSingleInstance', () => {
  it('requests the Single-instance lock once and returns true when this process holds it, without quitting', () => {
    const fake = createApp(false);

    const held = lockSingleInstance(fake.app, () => undefined);

    expect(held).toBe(true);
    expect(fake.lockRequests).toEqual([
      { userData: USER_DATA, granted: true, when: 'before-ready' },
    ]);
    expect(fake.quitCount()).toBe(0);
  });

  it('returns false and quits the app once when the lock is refused', () => {
    const fake = createApp(true);

    const held = lockSingleInstance(fake.app, () => undefined);

    expect(held).toBe(false);
    expect(fake.lockRequests).toEqual([
      { userData: USER_DATA, granted: false, when: 'before-ready' },
    ]);
    expect(fake.quitCount()).toBe(1);
  });

  it('restores a minimised window and focuses it on second-instance', () => {
    const fake = createApp(false);
    const window = new fake.electron.BrowserWindow({ show: false });
    lockSingleInstance(fake.app, () => window);
    window.minimize();

    fake.secondInstance();

    expect(window.isMinimized()).toBe(false);
    expect(window.isFocused()).toBe(true);
    expect(fake.quitCount()).toBe(0);
  });

  it('does nothing on second-instance while there is no window yet, and focuses the window once there is one', () => {
    const fake = createApp(false);
    // The window the app has, once it has one.
    const current: { window?: FakeBrowserWindow } = {};
    lockSingleInstance(fake.app, () => current.window);

    expect(() => {
      fake.secondInstance();
    }).not.toThrow();
    expect(fake.windows).toEqual([]);
    expect(fake.quitCount()).toBe(0);

    const window = new fake.electron.BrowserWindow({ show: false });
    current.window = window;
    window.minimize();
    fake.secondInstance();

    expect(window.isMinimized()).toBe(false);
    expect(window.isFocused()).toBe(true);
  });
});
