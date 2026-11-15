import { describe, expect, it } from 'vitest';
import { CHANNELS } from '@dashcash/contract';
import {
  createFakeElectron,
  type FakeIpcMainInvokeEvent,
} from '../../test-support/fakeElectron/fakeElectron.ts';
import { listAppOrigins } from '../../matchAppOrigin/matchAppOrigin.ts';
import { registerIpcHandlers } from './registerIpcHandlers.ts';

// Handler registration (design log Q22, Q24): one handler per Channel, each
// registered with `ipcMain.handle`; a handler's error rejects the page's
// promise with its message, no error envelope. The Sender check (Q27, A5)
// runs before every handler: only a frame on one of the App origins reaches
// it, anything else is refused with `Refused <channel> from <origin>`.

const INVENTED_APP_INFO = { version: '7.7.7-invented' };
const DEV_URL = 'http://localhost:5173';

// The App origins of the App build, and of `npm run dev`.
const BUILD_ORIGINS = listAppOrigins(undefined);
const DEV_ORIGINS = listAppOrigins(DEV_URL);

type SenderFrame = FakeIpcMainInvokeEvent['senderFrame'];

function frameAt(url: string): NonNullable<SenderFrame> {
  return { url, origin: new URL(url).origin };
}

// A frame on a custom scheme: Node's URL gives such a URL the origin "null",
// Electron's frame gives its scheme and host.
function appSchemeFrameAt(url: string): NonNullable<SenderFrame> {
  const { protocol, host } = new URL(url);
  return { url, origin: `${protocol}//${host}` };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The refusal the page's promise rejects with, as Electron hands it over:
// the error's string, prefixed with the channel.
function refusal(channel: string, origin: string): RegExp {
  return new RegExp(
    `Error: Refused ${escapeRegExp(channel)} from ${escapeRegExp(origin)}$`,
  );
}

// Registers an app:info handler that counts its calls.
function registerCounting(origins: readonly string[]) {
  const fake = createFakeElectron();
  const calls = { count: 0 };
  registerIpcHandlers(
    fake.electron.ipcMain,
    {
      'app:info': () => {
        calls.count += 1;
        return INVENTED_APP_INFO;
      },
    },
    origins,
  );
  return { fake, calls };
}

describe('registerIpcHandlers', () => {
  it('registers one handle per Channel, each once', () => {
    const fake = createFakeElectron();

    registerIpcHandlers(
      fake.electron.ipcMain,
      { 'app:info': () => INVENTED_APP_INFO },
      BUILD_ORIGINS,
    );

    const channels = fake.ipcHandlers.map(({ channel }) => channel);
    expect([...channels].sort()).toEqual([...CHANNELS].sort());
  });

  it("answers the page's invoke with the handler's response", async () => {
    const fake = createFakeElectron();
    registerIpcHandlers(
      fake.electron.ipcMain,
      { 'app:info': () => INVENTED_APP_INFO },
      BUILD_ORIGINS,
    );

    await expect(fake.invoke('app:info')).resolves.toEqual(INVENTED_APP_INFO);
  });

  it('answers with what an async handler resolves', async () => {
    const fake = createFakeElectron();
    registerIpcHandlers(
      fake.electron.ipcMain,
      { 'app:info': () => Promise.resolve(INVENTED_APP_INFO) },
      BUILD_ORIGINS,
    );

    await expect(fake.invoke('app:info')).resolves.toEqual(INVENTED_APP_INFO);
  });

  it("hands the handler the page's request, not the IPC event", async () => {
    const fake = createFakeElectron();
    const requests: unknown[][] = [];
    registerIpcHandlers(
      fake.electron.ipcMain,
      {
        'app:info': (...args: unknown[]) => {
          requests.push(args);
          return INVENTED_APP_INFO;
        },
      },
      BUILD_ORIGINS,
    );

    await fake.invoke('app:info', { invented: 'request' });

    expect(requests).toEqual([[{ invented: 'request' }]]);
  });

  it("rejects the page's promise with the message of a handler that throws", async () => {
    const fake = createFakeElectron();
    registerIpcHandlers(
      fake.electron.ipcMain,
      {
        'app:info': () => {
          throw new Error('Invented handler failure');
        },
      },
      BUILD_ORIGINS,
    );

    await expect(fake.invoke('app:info')).rejects.toThrow(
      'Invented handler failure',
    );
  });

  it("rejects the page's promise with the message of a handler that rejects", async () => {
    const fake = createFakeElectron();
    registerIpcHandlers(
      fake.electron.ipcMain,
      {
        'app:info': () =>
          Promise.reject(new Error('Invented async handler failure')),
      },
      BUILD_ORIGINS,
    );

    await expect(fake.invoke('app:info')).rejects.toThrow(
      'Invented async handler failure',
    );
  });

  describe('Sender check', () => {
    it.each([
      {
        case: 'another origin',
        frame: frameAt('https://example.com/index.html'),
      },
      {
        case: 'a look-alike host with a suffix',
        frame: appSchemeFrameAt('app://dashcash.evil/index.html'),
      },
      {
        case: 'a look-alike host with a prefix',
        frame: appSchemeFrameAt('app://evil-dashcash/index.html'),
      },
      {
        case: 'another port of the dev server host',
        frame: frameAt('http://localhost:5174/index.html'),
      },
    ])(
      'refuses a sender on $case with "Refused app:info from <origin>" without calling the handler, while the app\'s origin reaches it',
      async ({ frame }) => {
        const { fake, calls } = registerCounting(DEV_ORIGINS);

        await expect(fake.invokeFrom(frame, 'app:info')).rejects.toThrow(
          refusal('app:info', frame.origin),
        );
        expect(calls.count).toBe(0);

        await expect(fake.invoke('app:info')).resolves.toEqual(
          INVENTED_APP_INFO,
        );
        expect(calls.count).toBe(1);
      },
    );

    it('refuses a request whose sending frame is missing, without calling the handler', async () => {
      const { fake, calls } = registerCounting(BUILD_ORIGINS);

      await expect(fake.invokeFrom(null, 'app:info')).rejects.toThrow(
        /Error: Refused app:info from .+$/,
      );
      expect(calls.count).toBe(0);
    });

    it("lets the dev server's origin reach the handler when it is one of the App origins, and refuses it when it is not", async () => {
      const dev = registerCounting(DEV_ORIGINS);
      const build = registerCounting(BUILD_ORIGINS);
      const frame = frameAt(`${DEV_URL}/index.html`);

      await expect(dev.fake.invokeFrom(frame, 'app:info')).resolves.toEqual(
        INVENTED_APP_INFO,
      );
      await expect(build.fake.invokeFrom(frame, 'app:info')).rejects.toThrow(
        refusal('app:info', DEV_URL),
      );
      expect([dev.calls.count, build.calls.count]).toEqual([1, 0]);
    });
  });
});
