import { join } from 'node:path';
import {
  createMainWindow,
  type MainWindow,
  type MainWindowConstructor,
} from '../createMainWindow/createMainWindow.ts';
import { readDevServerUrl } from '../readDevServerUrl/readDevServerUrl.ts';

type App = {
  readonly isPackaged: boolean;
  getAppPath(): string;
  whenReady(): Promise<void>;
  on(event: 'window-all-closed', listener: () => void): unknown;
  quit(): void;
};

export type ElectronParts<Window extends MainWindow> = {
  app: App;
  BrowserWindow: MainWindowConstructor<Window>;
};

// Opens the main window once the app is ready and quits when the last window
// closes. Electron's default menu stays.
export function startApp<Window extends MainWindow>(
  { app, BrowserWindow }: ElectronParts<Window>,
  env: Readonly<Record<string, string | undefined>>,
): void {
  app.on('window-all-closed', () => {
    app.quit();
  });
  void app.whenReady().then(() => {
    createMainWindow(BrowserWindow, {
      indexFile: join(app.getAppPath(), 'out', 'renderer', 'index.html'),
      devServerUrl: readDevServerUrl(app, env),
    });
  });
}
