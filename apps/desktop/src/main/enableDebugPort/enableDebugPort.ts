import { readDevServerUrl } from '../readDevServerUrl/readDevServerUrl.ts';

const DEBUG_PORT = '9222';

// Lets DevTools tools attach to the app, in dev only: appends Chromium's
// remote-debugging-port switch when a dev server URL is given (unpackaged
// with ELECTRON_RENDERER_URL set). Call before the app is ready.
export function enableDebugPort(
  app: {
    readonly isPackaged: boolean;
    readonly commandLine: {
      appendSwitch(name: string, value?: string): void;
    };
  },
  env: Readonly<Record<string, string | undefined>>,
): void {
  if (readDevServerUrl(app, env) === undefined) {
    return;
  }
  app.commandLine.appendSwitch('remote-debugging-port', DEBUG_PORT);
}
