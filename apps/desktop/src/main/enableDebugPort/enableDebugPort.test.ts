import { describe, expect, it } from 'vitest';
import { createFakeElectron } from '../test-support/fakeElectron/fakeElectron.ts';
import { enableDebugPort } from './enableDebugPort.ts';

const DEV_URL = 'http://localhost:5173';

// The cause an invalid DASHCASH_DEBUG_PORT ends in (design log Q28).
const INVALID_PORT_CAUSE =
  'DASHCASH_DEBUG_PORT must be a whole number from 1 to 65535.';

// Every DASHCASH_DEBUG_PORT the tests try: `undefined` leaves it unset.
const VALID_PORTS = [
  { case: 'unset', value: undefined, port: '9222' },
  { case: 'empty', value: '', port: '9222' },
  { case: '1', value: '1', port: '1' },
  { case: '9222', value: '9222', port: '9222' },
  { case: '65535', value: '65535', port: '65535' },
] as const;

const INVALID_PORTS = [
  '0',
  '65536',
  '09222',
  '-1',
  '92.5',
  ' 9222',
  'abc',
] as const;

const EVERY_VALUE: readonly (string | undefined)[] = [
  ...VALID_PORTS.map(({ value }) => value),
  ...INVALID_PORTS,
];

// The env of a run: ELECTRON_RENDERER_URL as given, DASHCASH_DEBUG_PORT left
// out when `debugPort` is undefined.
function envWith(
  base: Readonly<Record<string, string>>,
  debugPort: string | undefined,
): Record<string, string> {
  return debugPort === undefined
    ? { ...base }
    : { ...base, DASHCASH_DEBUG_PORT: debugPort };
}

const DEV = { ELECTRON_RENDERER_URL: DEV_URL };

describe('enableDebugPort', () => {
  describe('in dev (not packaged, ELECTRON_RENDERER_URL set)', () => {
    it.each(VALID_PORTS)(
      'appends remote-debugging-port=$port once, before the app is ready, and returns undefined, with DASHCASH_DEBUG_PORT $case',
      ({ value, port }) => {
        const fake = createFakeElectron({ isPackaged: false });

        const result = enableDebugPort(fake.app, envWith(DEV, value));

        expect(result).toBeUndefined();
        expect(fake.commandLineSwitches).toEqual([
          { name: 'remote-debugging-port', value: port, when: 'before-ready' },
        ]);
        expect(
          fake.app.commandLine.getSwitchValue('remote-debugging-port'),
        ).toBe(port);
      },
    );

    it.each(INVALID_PORTS)(
      'returns the cause and appends no switch with DASHCASH_DEBUG_PORT "%s"',
      (value) => {
        const fake = createFakeElectron({ isPackaged: false });

        const result = enableDebugPort(fake.app, envWith(DEV, value));

        expect(result).toEqual({ cause: INVALID_PORT_CAUSE });
        expect(fake.commandLineSwitches).toEqual([]);
        expect(fake.app.commandLine.hasSwitch('remote-debugging-port')).toBe(
          false,
        );
      },
    );
  });

  describe('outside dev', () => {
    it.each([
      {
        case: 'packaged, even with ELECTRON_RENDERER_URL set',
        isPackaged: true,
        env: DEV,
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
    ])(
      'appends no switch and returns undefined for every DASHCASH_DEBUG_PORT, valid, invalid or unset, when $case',
      ({ isPackaged, env }) => {
        const results = EVERY_VALUE.map((value) => {
          const fake = createFakeElectron({ isPackaged });
          const result = enableDebugPort(fake.app, envWith(env, value));
          return {
            value,
            result,
            switches: fake.commandLineSwitches,
            hasSwitch: fake.app.commandLine.hasSwitch('remote-debugging-port'),
          };
        });

        expect(results).toEqual(
          EVERY_VALUE.map((value) => ({
            value,
            result: undefined,
            switches: [],
            hasSwitch: false,
          })),
        );
      },
    );
  });
});
