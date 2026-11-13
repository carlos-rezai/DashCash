import { describe, expect, it } from 'vitest';
import { createFakeElectron } from '../test-support/fakeElectron/fakeElectron.ts';
import { hardenSession } from './hardenSession.ts';

const APP_ORIGIN = 'app://dashcash';
const DEV_ORIGIN = 'http://localhost:5173';
const BUILD_ORIGINS = [APP_ORIGIN];
const DEV_ORIGINS = [APP_ORIGIN, DEV_ORIGIN];

// URLs off the App origins of the build: other origins, other schemes,
// other ports and look-alike hosts.
const OFF_ORIGIN_URLS = [
  'https://example.com/',
  'http://example.com/index.html',
  'file:///C:/invented/index.html',
  'app://dashcash.evil/index.html',
  'app://evil-dashcash/index.html',
  'app://dashcash@evil/index.html',
  'app://dashcash:8080/index.html',
  'https://dashcash/index.html',
  'http://localhost:5173/',
  'about:blank',
];

// A few of Electron's permission names; every one must be denied.
const PERMISSIONS = [
  'media',
  'geolocation',
  'notifications',
  'clipboard-read',
  'clipboard-sanitized-write',
  'fullscreen',
  'openExternal',
  'pointerLock',
  'midi',
  'hid',
  'serial',
  'usb',
  'idle-detection',
  'storage-access',
  'unknown',
];

function harden(origins: readonly string[] = BUILD_ORIGINS) {
  const fake = createFakeElectron();
  hardenSession(fake.electron, origins);
  return fake;
}

describe('hardenSession', () => {
  describe('navigation', () => {
    it.each([
      'app://dashcash/index.html',
      'app://dashcash/other.html',
      'app://dashcash/index.html?invented=1#part',
    ])('allows same-origin navigation to %s', (url) => {
      const contents = harden().createWebContents();

      expect(contents.navigate(url)).toBe('allowed');
    });

    it.each(['app://dashcash/index.html', 'app://dashcash/other.html'])(
      'allows a same-origin redirect to %s',
      (url) => {
        const contents = harden().createWebContents();

        expect(contents.redirect(url)).toBe('allowed');
      },
    );

    it.each(OFF_ORIGIN_URLS)('prevents will-navigate to %s', (url) => {
      const contents = harden().createWebContents();

      expect(contents.navigate(url)).toBe('prevented');
    });

    it.each(OFF_ORIGIN_URLS)('prevents will-redirect to %s', (url) => {
      const contents = harden().createWebContents();

      expect(contents.redirect(url)).toBe('prevented');
    });

    it("allows navigation to the dev server's origin when it is an App origin", () => {
      const contents = harden(DEV_ORIGINS).createWebContents();

      expect(contents.navigate('http://localhost:5173/')).toBe('allowed');
      expect(contents.redirect('http://localhost:5173/index.html')).toBe(
        'allowed',
      );
    });

    it.each([
      'http://localhost:5174/',
      'https://localhost:5173/',
      'http://127.0.0.1:5173/',
    ])("prevents navigation next to the dev server's origin, to %s", (url) => {
      const contents = harden(DEV_ORIGINS).createWebContents();

      expect(contents.navigate(url)).toBe('prevented');
      expect(contents.redirect(url)).toBe('prevented');
    });

    it('guards every web contents created, not only the first', () => {
      const fake = harden();
      fake.createWebContents();
      const second = fake.createWebContents();

      expect(second.navigate('https://example.com/')).toBe('prevented');
    });
  });

  describe('new windows', () => {
    it.each([
      'app://dashcash/index.html',
      'https://example.com/',
      'file:///C:/invented/index.html',
      'about:blank',
    ])('denies a window open to %s', (url) => {
      const contents = harden().createWebContents();

      expect(contents.openWindow(url)).toEqual({ action: 'deny' });
    });

    it("denies a window open to the dev server's origin in dev", () => {
      const contents = harden(DEV_ORIGINS).createWebContents();

      expect(contents.openWindow('http://localhost:5173/')).toEqual({
        action: 'deny',
      });
    });
  });

  describe('webviews', () => {
    it.each(['app://dashcash/index.html', 'https://example.com/'])(
      'prevents will-attach-webview for %s',
      (src) => {
        const contents = harden().createWebContents();

        expect(contents.attachWebview(src)).toBe('prevented');
      },
    );
  });

  describe('permissions', () => {
    it.each(PERMISSIONS)(
      'denies a request for %s, even from the App origin',
      async (permission) => {
        const fake = harden();

        await expect(
          fake.requestPermission(permission, 'app://dashcash/index.html'),
        ).resolves.toBe(false);
      },
    );

    it.each(PERMISSIONS)(
      'denies a check of %s, even for the App origin',
      (permission) => {
        const fake = harden();

        expect(fake.checkPermission(permission, APP_ORIGIN)).toBe(false);
      },
    );

    it('denies a request and a check from another origin', async () => {
      const fake = harden();

      await expect(
        fake.requestPermission('media', 'https://example.com/'),
      ).resolves.toBe(false);
      expect(fake.checkPermission('media', 'https://example.com')).toBe(false);
    });

    it("denies a request and a check from the dev server's origin in dev", async () => {
      const fake = harden(DEV_ORIGINS);

      await expect(
        fake.requestPermission('notifications', 'http://localhost:5173/'),
      ).resolves.toBe(false);
      expect(fake.checkPermission('notifications', DEV_ORIGIN)).toBe(false);
    });
  });
});
