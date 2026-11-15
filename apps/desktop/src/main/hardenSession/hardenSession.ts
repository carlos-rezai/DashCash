import { isAppOrigin } from '../matchAppOrigin/matchAppOrigin.ts';

type PreventableEvent = { preventDefault(): void };

type GuardedWebContents = {
  setWindowOpenHandler(handler: () => { action: 'deny' }): void;
  on(
    event: 'will-navigate' | 'will-redirect',
    listener: (event: PreventableEvent, url: string) => void,
  ): unknown;
  on(
    event: 'will-attach-webview',
    listener: (event: PreventableEvent) => void,
  ): unknown;
};

// The parts of Electron the hardening uses, so the module takes them as
// parameters (A1).
export type HardenSessionElectron = {
  app: {
    on(
      event: 'web-contents-created',
      listener: (event: unknown, contents: GuardedWebContents) => void,
    ): unknown;
  };
  session: {
    defaultSession: {
      setPermissionRequestHandler(
        handler: (
          webContents: unknown,
          permission: string,
          callback: (granted: boolean) => void,
        ) => void,
      ): void;
      setPermissionCheckHandler(handler: () => boolean): void;
    };
  };
};

// The window never leaves the App origins and the page is granted nothing
// (design log Q15): navigations and redirects off the App origins are
// prevented, every window open is denied, webviews are prevented, and every
// permission request and check is denied.
export function hardenSession(
  { app, session }: HardenSessionElectron,
  origins: readonly string[],
): void {
  app.on('web-contents-created', (_event, contents) => {
    const guard = (event: PreventableEvent, url: string): void => {
      if (!isAppOrigin(url, origins)) {
        event.preventDefault();
      }
    };
    contents.on('will-navigate', guard);
    contents.on('will-redirect', guard);
    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false);
    },
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
}
