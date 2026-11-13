import { describe, expect, it } from 'vitest';
import { readDevServerUrl } from '../readDevServerUrl/readDevServerUrl.ts';
import { isAppOrigin, listAppOrigins } from './matchAppOrigin.ts';

const APP_ORIGIN = 'app://dashcash';
const DEV_URL = 'http://localhost:5173';

describe('listAppOrigins', () => {
  it('lists app://dashcash alone without a dev server URL', () => {
    expect(listAppOrigins(undefined)).toEqual([APP_ORIGIN]);
  });

  it("adds the dev server's origin when a dev server URL is given", () => {
    expect(listAppOrigins(DEV_URL)).toEqual([APP_ORIGIN, DEV_URL]);
  });

  it("adds the dev server's origin, not its path, for a URL with a path", () => {
    expect(listAppOrigins('http://localhost:5173/renderer/index.html')).toEqual(
      [APP_ORIGIN, DEV_URL],
    );
  });

  it.each([
    {
      case: 'packaged, even with ELECTRON_RENDERER_URL set',
      isPackaged: true,
      env: { ELECTRON_RENDERER_URL: DEV_URL },
      origins: [APP_ORIGIN],
    },
    {
      case: 'not packaged without ELECTRON_RENDERER_URL',
      isPackaged: false,
      env: {},
      origins: [APP_ORIGIN],
    },
    {
      case: 'not packaged with ELECTRON_RENDERER_URL set',
      isPackaged: false,
      env: { ELECTRON_RENDERER_URL: DEV_URL },
      origins: [APP_ORIGIN, DEV_URL],
    },
  ])(
    'makes the App origins $origins when $case',
    ({ isPackaged, env, origins }) => {
      expect(listAppOrigins(readDevServerUrl({ isPackaged }, env))).toEqual(
        origins,
      );
    },
  );
});

describe('isAppOrigin', () => {
  const buildOrigins = [APP_ORIGIN];
  const devOrigins = [APP_ORIGIN, DEV_URL];

  it.each([
    'app://dashcash',
    'app://dashcash/',
    'app://dashcash/index.html',
    'app://dashcash/assets/deep/page.html?invented=1#part',
  ])('accepts %s on the App origins', (url) => {
    expect(isAppOrigin(url, buildOrigins)).toBe(true);
  });

  it.each([
    'http://localhost:5173',
    'http://localhost:5173/',
    'http://localhost:5173/index.html?invented=1',
  ])("accepts %s when the dev server's origin is an App origin", (url) => {
    expect(isAppOrigin(url, devOrigins)).toBe(true);
  });

  it.each([
    { case: 'a look-alike host with a suffix', url: 'app://dashcash.evil/' },
    { case: 'a look-alike host with a prefix', url: 'app://evil-dashcash/' },
    { case: 'a look-alike host as user info', url: 'app://dashcash@evil/' },
    { case: 'another host', url: 'app://invented/index.html' },
    { case: 'another port', url: 'app://dashcash:8080/index.html' },
    { case: 'the https scheme', url: 'https://dashcash/index.html' },
    { case: 'the http scheme', url: 'http://dashcash/index.html' },
    { case: 'the file scheme', url: 'file:///C:/invented/index.html' },
    { case: 'a web page', url: 'https://example.com/' },
    { case: 'about:blank', url: 'about:blank' },
    { case: 'a javascript URL', url: 'javascript:alert(1)' },
    { case: 'a data URL', url: 'data:text/html,<p>invented</p>' },
    { case: 'a string that is no URL', url: 'not a url' },
    { case: 'an empty string', url: '' },
  ])('refuses $case ($url)', ({ url }) => {
    expect(isAppOrigin(url, devOrigins)).toBe(false);
  });

  it.each([
    { case: 'another port', url: 'http://localhost:5174/' },
    { case: 'another scheme', url: 'https://localhost:5173/' },
    { case: 'a look-alike host', url: 'http://localhost.evil:5173/' },
    {
      case: 'a look-alike host with a suffix',
      url: 'http://localhost:5173.evil/',
    },
    { case: 'another host', url: 'http://127.0.0.1:5173/' },
  ])("refuses $case of the dev server's origin ($url)", ({ url }) => {
    expect(isAppOrigin(url, devOrigins)).toBe(false);
  });

  it("refuses the dev server's origin when it is not an App origin", () => {
    expect(isAppOrigin('http://localhost:5173/', buildOrigins)).toBe(false);
  });

  it('refuses every URL when there are no App origins', () => {
    expect(isAppOrigin('app://dashcash/index.html', [])).toBe(false);
  });
});
