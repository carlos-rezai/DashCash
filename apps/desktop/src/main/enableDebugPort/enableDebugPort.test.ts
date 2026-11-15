import { describe, expect, it } from 'vitest';
import { createFakeElectron } from '../test-support/fakeElectron/fakeElectron.ts';
import { enableDebugPort } from './enableDebugPort.ts';

const DEV_URL = 'http://localhost:5173';

describe('enableDebugPort', () => {
  it("appends Chromium's remote-debugging-port=9222 switch once when the app is not packaged and ELECTRON_RENDERER_URL is set", () => {
    const fake = createFakeElectron({ isPackaged: false });

    enableDebugPort(fake.app, { ELECTRON_RENDERER_URL: DEV_URL });

    expect(fake.commandLineSwitches).toEqual([
      { name: 'remote-debugging-port', value: '9222', when: 'before-ready' },
    ]);
    expect(fake.app.commandLine.getSwitchValue('remote-debugging-port')).toBe(
      '9222',
    );
  });

  it.each([
    {
      case: 'packaged, even with ELECTRON_RENDERER_URL set',
      isPackaged: true,
      env: { ELECTRON_RENDERER_URL: DEV_URL },
    },
    {
      case: 'packaged without ELECTRON_RENDERER_URL',
      isPackaged: true,
      env: {},
    },
    {
      case: 'not packaged without ELECTRON_RENDERER_URL',
      isPackaged: false,
      env: {},
    },
    {
      case: 'not packaged with an empty ELECTRON_RENDERER_URL',
      isPackaged: false,
      env: { ELECTRON_RENDERER_URL: '' },
    },
  ])('appends no switch when $case', ({ isPackaged, env }) => {
    const fake = createFakeElectron({ isPackaged });

    enableDebugPort(fake.app, env);

    expect(fake.commandLineSwitches).toEqual([]);
    expect(fake.app.commandLine.hasSwitch('remote-debugging-port')).toBe(false);
  });
});
