import { mkdirSync } from 'node:fs';
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
import { getAppInfo } from '../ipc/getAppInfo/getAppInfo.ts';
import {
  registerIpcHandlers,
  type IpcMainElectron,
} from '../ipc/registerIpcHandlers/registerIpcHandlers.ts';
import { readDevServerUrl } from '../readDevServerUrl/readDevServerUrl.ts';
import { resolveDataFolder } from '../resolveDataFolder/resolveDataFolder.ts';
import { showStartupError } from '../showStartupError/showStartupError.ts';

type App = HardenSessionElectron['app'] & {
  readonly isPackaged: boolean;
  getAppPath(): string;
  getVersion(): string;
  getPath(name: 'userData'): string;
  setPath(name: 'userData', path: string): void;
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
  ipcMain: IpcMainElectron;
  dialog: { showErrorBox(title: string, content: string): void };
};

// Resolves the Data folder first (a relative override ends in the Startup
// error); registers the App protocol; once the app is ready, creates the Data
// folder, hardens the session, registers the IPC handlers and opens the main
// window. Quits when the last window closes. Electron's default menu stays.
export function startApp<Window extends MainWindow>(
  {
    app,
    BrowserWindow,
    screen,
    protocol,
    net,
    session,
    ipcMain,
    dialog,
  }: ElectronParts<Window>,
  env: Readonly<Record<string, string | undefined>>,
): void {
  const dataFolder = resolveDataFolder(env, app.getPath('userData'));
  if ('cause' in dataFolder) {
    showStartupError(
      dialog,
      app,
      dataFolder.cause,
      env['DASHCASH_DATA_FOLDER'] ?? '',
    );
    return;
  }
  if (dataFolder.overridden) {
    app.setPath('userData', dataFolder.folder);
  }
  app.enableSandbox();
  // Settles when the Data folder exists; never when it cannot be created, so
  // nothing else starts after the Startup error.
  const dataFolderReady = new Promise<void>((resolve) => {
    void app.whenReady().then(() => {
      try {
        mkdirSync(dataFolder.folder, { recursive: true });
      } catch (error) {
        showStartupError(
          dialog,
          app,
          error instanceof Error ? error.message : String(error),
          dataFolder.folder,
        );
        return;
      }
      resolve();
    });
  });
  registerAppProtocol(
    { app: { whenReady: () => dataFolderReady }, protocol, net },
    join(app.getAppPath(), 'out', 'renderer'),
  );
  app.on('window-all-closed', () => {
    app.quit();
  });
  void dataFolderReady.then(() => {
    const devServerUrl = readDevServerUrl(app, env);
    const origins = listAppOrigins(devServerUrl);
    hardenSession({ app, session }, origins);
    registerIpcHandlers(
      ipcMain,
      { 'app:info': () => getAppInfo(app) },
      origins,
    );
    createMainWindow(BrowserWindow, {
      devServerUrl,
      workArea: screen.getPrimaryDisplay().workArea,
      preloadPath: join(app.getAppPath(), 'out', 'preload', 'preload.cjs'),
    });
  });
}
