import { describe, expect, it } from 'vitest';
import { createFakeElectron } from '../../test-support/fakeElectron/fakeElectron.ts';
import { getAppInfo } from './getAppInfo.ts';

// The `app:info` Channel's answer (design log Q20, Q23): the App version, as
// Electron's `app.getVersion()` reports it. `app:info` takes no request, so
// whatever the page sends is ignored.

const INVENTED_VERSION = '3.14.15-invented';

describe('getAppInfo', () => {
  it("returns the app's version, and nothing else", () => {
    const { app } = createFakeElectron({ version: INVENTED_VERSION });

    expect(getAppInfo(app)).toStrictEqual({ version: INVENTED_VERSION });
  });

  it.each([
    { case: 'undefined', argument: undefined },
    { case: 'null', argument: null },
    { case: 'a forged AppInfo', argument: { version: '6.6.6-forged' } },
    { case: 'a string', argument: '6.6.6-forged' },
  ])('ignores $case passed after the app', ({ argument }) => {
    const { app } = createFakeElectron({ version: INVENTED_VERSION });
    const untypedGetAppInfo = getAppInfo as (...args: unknown[]) => unknown;

    expect(untypedGetAppInfo(app, argument)).toStrictEqual({
      version: INVENTED_VERSION,
    });
  });
});
