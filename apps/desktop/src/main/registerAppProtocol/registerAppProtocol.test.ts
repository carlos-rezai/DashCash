import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFakeElectron } from '../test-support/fakeElectron/fakeElectron.ts';
import {
  registerAppProtocol,
  resolveRendererPath,
} from './registerAppProtocol.ts';

// The App protocol (design log Q16): the scheme `app`, origin
// `app://dashcash`, serves only files under the built renderer folder and
// answers 404 for any path that resolves outside it.

const RENDERER_FOLDER = resolve('/invented/dashcash-app/out/renderer');

// Each URL names `secret.txt` beside the renderer folder, or a path elsewhere
// on the machine, in a way that survives URL parsing; every one is refused on
// every platform.
const REFUSED_URLS = [
  { case: '..', url: 'app://dashcash/..%2Fsecret.txt' },
  {
    case: '.. out of a subfolder',
    url: 'app://dashcash/assets/..%2F..%2Fsecret.txt',
  },
  { case: '.. with a backslash', url: 'app://dashcash/..%5Csecret.txt' },
  { case: 'encoded ..', url: 'app://dashcash/%2E%2E%2Fsecret.txt' },
  {
    case: 'encoded .. in lower case',
    url: 'app://dashcash/%2e%2e%2fsecret.txt',
  },
  {
    case: 'encoded .. with a backslash',
    url: 'app://dashcash/%2E%2E%5Csecret.txt',
  },
  { case: 'an absolute path', url: 'app://dashcash//invented/secret.txt' },
  {
    case: 'an encoded absolute path',
    url: 'app://dashcash/%2Finvented%2Fsecret.txt',
  },
  {
    case: 'a path on another drive',
    url: 'app://dashcash/C:%5Cinvented%5Csecret.txt',
  },
  {
    case: 'a drive path with slashes',
    url: 'app://dashcash/D:/invented/secret.txt',
  },
  { case: 'a drive-relative path', url: 'app://dashcash/C:secret.txt' },
  {
    case: 'a path from the root of the drive',
    url: 'app://dashcash/%5Cinvented%5Csecret.txt',
  },
  {
    case: 'a path on another root',
    url: 'app://dashcash/%5C%5Cinvented-server%5Cshare%5Csecret.txt',
  },
  {
    case: 'malformed percent-encoding',
    url: 'app://dashcash/%E0%A4%A',
  },
  { case: 'the renderer folder itself', url: 'app://dashcash/' },
  { case: 'the renderer folder as a dot', url: 'app://dashcash/.' },
];

describe('resolveRendererPath', () => {
  it.each([
    {
      case: 'the page',
      url: 'app://dashcash/index.html',
      path: ['index.html'],
    },
    {
      case: 'a file in a subfolder',
      url: 'app://dashcash/assets/index-Bq3x7Kd.js',
      path: ['assets', 'index-Bq3x7Kd.js'],
    },
    {
      case: 'a file with an encoded name',
      url: 'app://dashcash/assets/invented%20font.woff2',
      path: ['assets', 'invented font.woff2'],
    },
  ])(
    'returns the path of $case inside the renderer folder',
    ({ url, path }) => {
      expect(resolveRendererPath(RENDERER_FOLDER, url)).toBe(
        join(RENDERER_FOLDER, ...path),
      );
    },
  );

  it.each(REFUSED_URLS)('returns undefined for $case', ({ url }) => {
    expect(resolveRendererPath(RENDERER_FOLDER, url)).toBeUndefined();
  });
});

describe('registerAppProtocol', () => {
  const PAGE = '<!doctype html><title>Invented page</title>';
  const SCRIPT = 'invented script';
  const SECRET = 'invented secret';

  // A temporary folder holding an invented renderer folder and, beside it,
  // a file the protocol must never serve.
  let root: string;
  let rendererFolder: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dashcash-app-protocol-'));
    rendererFolder = join(root, 'renderer');
    mkdirSync(join(rendererFolder, 'assets'), { recursive: true });
    writeFileSync(join(rendererFolder, 'index.html'), PAGE);
    writeFileSync(join(rendererFolder, 'assets', 'index-Bq3x7Kd.js'), SCRIPT);
    writeFileSync(join(root, 'secret.txt'), SECRET);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function register() {
    const fake = createFakeElectron();
    registerAppProtocol(fake.electron, rendererFolder);
    return fake;
  }

  it('registers the scheme app as privileged, standard and secure, once, before the app is ready', async () => {
    const fake = register();

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

  it('registers no handler before the app is ready', () => {
    const fake = register();

    expect(fake.protocolHandlers).toEqual([]);
  });

  it('registers the handler of the scheme app, once, when the app is ready', async () => {
    const fake = register();

    await fake.ready();

    expect(fake.protocolHandlers).toEqual([
      { scheme: 'app', when: 'after-ready' },
    ]);
  });

  it.each([
    { case: 'the page', url: 'app://dashcash/index.html', body: PAGE },
    {
      case: 'a file in a subfolder',
      url: 'app://dashcash/assets/index-Bq3x7Kd.js',
      body: SCRIPT,
    },
  ])('serves $case from the renderer folder', async ({ url, body }) => {
    const fake = register();
    await fake.ready();

    const response = await fake.request(url);

    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe(body);
  });

  it.each(REFUSED_URLS)('answers $case with 404', async ({ url }) => {
    const fake = register();
    await fake.ready();

    const response = await fake.request(url);

    expect(response?.status).toBe(404);
  });

  it('answers the absolute path of a file outside the renderer folder with 404', async () => {
    const fake = register();
    await fake.ready();
    const secretPath = encodeURIComponent(join(root, 'secret.txt'));

    const response = await fake.request(`app://dashcash/${secretPath}`);

    expect(response?.status).toBe(404);
    expect(await response?.text()).not.toBe(SECRET);
  });
});
