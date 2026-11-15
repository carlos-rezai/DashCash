import { join } from 'node:path';
import {
  createMainWindow,
  type MainWindow,
  type MainWindowConstructor,
  type WorkArea,
} from '../createMainWindow/createMainWindow.ts';
import {
  registerAppProtocol,
  serveAppProtocol,
  type AppProtocolElectron,
} from '../registerAppProtocol/registerAppProtocol.ts';
import {
  hardenSession,
  type HardenSessionElectron,
} from '../hardenSession/hardenSession.ts';
import { listAppOrigins } from '../matchAppOrigin/matchAppOrigin.ts';
import { enableDebugPort } from '../enableDebugPort/enableDebugPort.ts';
import { openDataFolderDatabase } from '../db/openDataFolderDatabase/openDataFolderDatabase.ts';
import { getAppInfo } from '../ipc/getAppInfo/getAppInfo.ts';
import {
  registerIpcHandlers,
  type IpcMainElectron,
} from '../ipc/registerIpcHandlers/registerIpcHandlers.ts';
import {
  lockSingleInstance,
  type FocusableWindow,
} from '../lockSingleInstance/lockSingleInstance.ts';
import { readDevServerUrl } from '../readDevServerUrl/readDevServerUrl.ts';
import { resolveDataFolder } from '../resolveDataFolder/resolveDataFolder.ts';
import { showStartupError } from '../showStartupError/showStartupError.ts';

type App = HardenSessionElectron['app'] & {
  readonly isPackaged: boolean;
  readonly commandLine: { appendSwitch(name: string, value?: string): void };
  getAppPath(): string;
  getVersion(): string;
  getPath(name: 'userData'): string;
  setPath(name: 'userData', path: string): void;
  whenReady(): Promise<void>;
  enableSandbox(): void;
  requestSingleInstanceLock(): boolean;
  on(
    event: 'window-all-closed' | 'will-quit' | 'second-instance',
    listener: () => void,
  ): unknown;
  quit(): void;
};

type Screen = {
  getPrimaryDisplay(): { workArea: WorkArea };
};

export type ElectronParts<Window extends MainWindow & FocusableWindow> = {
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
// error); takes the Single-instance lock on it (a second process quits here);
// registers the App protocol's scheme; opens the Debug port in dev; once the
// app is ready, creates the Data folder, opens and migrates the Database
// (closed on will-quit; a failure ends in the Startup error); once the
// Database is open, serves the App protocol, hardens the session, registers
// the IPC handlers and opens the main window. Quits when the last window
// closes. Electron's default menu stays.
export function startApp<Window extends MainWindow & FocusableWindow>(
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
  const main: { window?: Window } = {};
  if (!lockSingleInstance(app, () => main.window)) {
    return;
  }
  app.enableSandbox();
  // Settles when the Data folder exists and the Database is open and
  // migrated; never after the Startup error, so nothing else starts then.
  const dataFolderReady = new Promise<void>((resolve) => {
    void app.whenReady().then(() => {
      try {
        const database = openDataFolderDatabase(dataFolder.folder);
        app.on('will-quit', () => {
          database.close();
        });
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
  registerAppProtocol(protocol);
  enableDebugPort(app, env);
  app.on('window-all-closed', () => {
    app.quit();
  });
  void dataFolderReady.then(() => {
    serveAppProtocol(
      { protocol, net },
      join(app.getAppPath(), 'out', 'renderer'),
    );
    const devServerUrl = readDevServerUrl(app, env);
    const origins = listAppOrigins(devServerUrl);
    hardenSession({ app, session }, origins);
    registerIpcHandlers(
      ipcMain,
      { 'app:info': () => getAppInfo(app) },
      origins,
    );
    main.window = createMainWindow(BrowserWindow, {
      devServerUrl,
      workArea: screen.getPrimaryDisplay().workArea,
      preloadPath: join(app.getAppPath(), 'out', 'preload', 'preload.cjs'),
    });
  });
}
