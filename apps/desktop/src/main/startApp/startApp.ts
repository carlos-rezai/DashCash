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
import { readDevServerUrl } from '../readDevServerUrl/readDevServerUrl.ts';

type App = {
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
};

// Registers the App protocol, opens the main window once the app is ready
// and quits when the last window closes. Electron's default menu stays.
export function startApp<Window extends MainWindow>(
  { app, BrowserWindow, screen, protocol, net }: ElectronParts<Window>,
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
    createMainWindow(BrowserWindow, {
      devServerUrl: readDevServerUrl(app, env),
      workArea: screen.getPrimaryDisplay().workArea,
    });
  });
}
