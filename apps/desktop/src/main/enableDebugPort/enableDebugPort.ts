import { readDevServerUrl } from '../readDevServerUrl/readDevServerUrl.ts';

const DEFAULT_DEBUG_PORT = '9222';
const MAX_PORT = 65535;
const PORT_PATTERN = /^[1-9]\d{0,4}$/;
const INVALID_PORT_CAUSE =
  'DASHCASH_DEBUG_PORT must be a whole number from 1 to 65535.';

// Lets DevTools tools attach to the app, in dev only: appends Chromium's
// remote-debugging-port switch when a dev server URL is given (unpackaged
// with ELECTRON_RENDERER_URL set). The port is DASHCASH_DEBUG_PORT, 9222 when
// it is unset or empty; an invalid port appends nothing and returns the
// cause. Call before the app is ready.
export function enableDebugPort(
  app: {
    readonly isPackaged: boolean;
    readonly commandLine: {
      appendSwitch(name: string, value?: string): void;
    };
  },
  env: Readonly<Record<string, string | undefined>>,
): { cause: string } | undefined {
  if (readDevServerUrl(app, env) === undefined) {
    return undefined;
  }
  const requested = env['DASHCASH_DEBUG_PORT'];
  const port =
    requested === undefined || requested === ''
      ? DEFAULT_DEBUG_PORT
      : requested;
  if (!PORT_PATTERN.test(port) || Number(port) > MAX_PORT) {
    return { cause: INVALID_PORT_CAUSE };
  }
  app.commandLine.appendSwitch('remote-debugging-port', port);
  return undefined;
}
