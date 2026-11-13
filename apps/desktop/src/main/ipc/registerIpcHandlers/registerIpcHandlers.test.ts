import { describe, expect, it } from 'vitest';
import { CHANNELS } from '@dashcash/contract';
import { createFakeElectron } from '../../test-support/fakeElectron/fakeElectron.ts';
import { registerIpcHandlers } from './registerIpcHandlers.ts';

// Handler registration (design log Q22, Q24): one handler per Channel, each
// registered with `ipcMain.handle`; a handler's error rejects the page's
// promise with its message, no error envelope. The Sender check follows in
// 09.

const INVENTED_APP_INFO = { version: '7.7.7-invented' };

describe('registerIpcHandlers', () => {
  it('registers one handle per Channel, each once', () => {
    const fake = createFakeElectron();

    registerIpcHandlers(fake.electron.ipcMain, {
      'app:info': () => INVENTED_APP_INFO,
    });

    const channels = fake.ipcHandlers.map(({ channel }) => channel);
    expect([...channels].sort()).toEqual([...CHANNELS].sort());
  });

  it("answers the page's invoke with the handler's response", async () => {
    const fake = createFakeElectron();
    registerIpcHandlers(fake.electron.ipcMain, {
      'app:info': () => INVENTED_APP_INFO,
    });

    await expect(fake.invoke('app:info')).resolves.toEqual(INVENTED_APP_INFO);
  });

  it('answers with what an async handler resolves', async () => {
    const fake = createFakeElectron();
    registerIpcHandlers(fake.electron.ipcMain, {
      'app:info': () => Promise.resolve(INVENTED_APP_INFO),
    });

    await expect(fake.invoke('app:info')).resolves.toEqual(INVENTED_APP_INFO);
  });

  it("hands the handler the page's request, not the IPC event", async () => {
    const fake = createFakeElectron();
    const requests: unknown[][] = [];
    registerIpcHandlers(fake.electron.ipcMain, {
      'app:info': (...args: unknown[]) => {
        requests.push(args);
        return INVENTED_APP_INFO;
      },
    });

    await fake.invoke('app:info', { invented: 'request' });

    expect(requests).toEqual([[{ invented: 'request' }]]);
  });

  it("rejects the page's promise with the message of a handler that throws", async () => {
    const fake = createFakeElectron();
    registerIpcHandlers(fake.electron.ipcMain, {
      'app:info': () => {
        throw new Error('Invented handler failure');
      },
    });

    await expect(fake.invoke('app:info')).rejects.toThrow(
      'Invented handler failure',
    );
  });

  it("rejects the page's promise with the message of a handler that rejects", async () => {
    const fake = createFakeElectron();
    registerIpcHandlers(fake.electron.ipcMain, {
      'app:info': () =>
        Promise.reject(new Error('Invented async handler failure')),
    });

    await expect(fake.invoke('app:info')).rejects.toThrow(
      'Invented async handler failure',
    );
  });
});
