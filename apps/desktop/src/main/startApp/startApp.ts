import { join } from 'node:path';
import {
  createMainWindow,
  type MainWindow,
  type MainWindowConstructor,
  type WorkArea,
} from '../createMainWindow/createMainWindow.ts';
import {
  registerAppProtocol,
  type AppProtocolElectron,
} from '../registerAppProtocol/registerAppProtocol.ts';
import {
  hardenSession,
  type HardenSessionElectron,
} from '../hardenSession/hardenSession.ts';
import { listAppOrigins } from '../matchAppOrigin/matchAppOrigin.ts';
import { readDevServerUrl } from '../readDevServerUrl/readDevServerUrl.ts';

type App = HardenSessionElectron['app'] & {
  readonly isPackaged: boolean;
  getAppPath(): string;
  whenReady(): Promise<void>;
  enableSandbox(): void;
  on(event: 'window-all-closed', listener: () => void): unknown;
  quit(): void;
};

type Screen = {
  getPrimaryDisplay(): { workArea: WorkArea };
};

export type ElectronParts<Window extends MainWindow> = {
  app: App;
  BrowserWindow: MainWindowConstructor<Window>;
  screen: Screen;
  protocol: AppProtocolElectron['protocol'];
  net: AppProtocolElectron['net'];
  session: HardenSessionElectron['session'];
};

// Registers the App protocol; once the app is ready, hardens the session and
// opens the main window. Quits when the last window closes. Electron's default
// menu stays.
export function startApp<Window extends MainWindow>(
  { app, BrowserWindow, screen, protocol, net, session }: ElectronParts<Window>,
  env: Readonly<Record<string, string | undefined>>,
): void {
  app.enableSandbox();
  registerAppProtocol(
    { app, protocol, net },
    join(app.getAppPath(), 'out', 'renderer'),
  );
  app.on('window-all-closed', () => {
    app.quit();
  });
  void app.whenReady().then(() => {
    const devServerUrl = readDevServerUrl(app, env);
    hardenSession({ app, session }, listAppOrigins(devServerUrl));
    createMainWindow(BrowserWindow, {
      devServerUrl,
      workArea: screen.getPrimaryDisplay().workArea,
    });
  });
}
