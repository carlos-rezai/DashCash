import { EventEmitter } from 'node:events';

// A fake of the Electron objects main's modules take as parameters (A1):
// `app`, `BrowserWindow`, `Menu` and `screen`. It records what a module does
// with them (windows created, shown, loaded, closed; quits; menu changes; the
// sandbox enabled) so a test can assert behaviour without Electron.

export type FakeElectronOptions = {
  isPackaged?: boolean;
  appPath?: string;
  // The primary display's work area; larger than 1440 × 900 unless given.
  workArea?: WorkArea;
};

export type WorkArea = { x: number; y: number; width: number; height: number };

// When `app.enableSandbox()` was called: before or after the app was ready.
export type SandboxCall = 'before-ready' | 'after-ready';

export type LoadedPage =
  { kind: 'file'; path: string } | { kind: 'url'; url: string };

type WindowOptions = {
  show?: boolean;
  title?: string;
  autoHideMenuBar?: boolean;
  [option: string]: unknown;
};

export type FakeBrowserWindow = EventEmitter & {
  readonly options: WindowOptions;
  isVisible(): boolean;
  getTitle(): string;
  setTitle(title: string): void;
  show(): void;
  showInactive(): void;
  hide(): void;
  loadFile(path: string): Promise<void>;
  loadURL(url: string): Promise<void>;
  loadedPage(): LoadedPage | undefined;
  setMenu(menu: unknown): void;
  removeMenu(): void;
  setMenuBarVisibility(visible: boolean): void;
  setAutoHideMenuBar(hide: boolean): void;
  close(): void;
  isDestroyed(): boolean;
  emitReadyToShow(): void;
};

export type FakeElectron = {
  // The object a module receives in place of the `electron` module.
  electron: {
    app: FakeApp;
    BrowserWindow: new (options?: WindowOptions) => FakeBrowserWindow;
    Menu: FakeMenu;
    screen: FakeScreen;
  };
  app: FakeApp;
  // Every window created, in order, closed ones included.
  windows: FakeBrowserWindow[];
  // Every change to a menu, application or window, as `<call>`.
  menuChanges: string[];
  // Every call of `app.enableSandbox()`, in order.
  sandboxCalls: SandboxCall[];
  // How often `app.quit()` was called.
  quitCount(): number;
  // Makes the app ready: resolves `whenReady()`, emits `ready`, and lets
  // pending promise callbacks run.
  ready(): Promise<void>;
};

type FakeApp = EventEmitter & {
  readonly isPackaged: boolean;
  getAppPath(): string;
  isReady(): boolean;
  whenReady(): Promise<void>;
  enableSandbox(): void;
  quit(): void;
};

type FakeScreen = {
  getPrimaryDisplay(): { workArea: WorkArea };
};

type FakeMenu = {
  setApplicationMenu(menu: unknown): void;
  buildFromTemplate(template: unknown): unknown;
  getApplicationMenu(): unknown;
};

const DEFAULT_APP_PATH = '/invented/dashcash-app';
const DEFAULT_WORK_AREA: WorkArea = { x: 0, y: 0, width: 1920, height: 1040 };

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

export function createFakeElectron(
  options: FakeElectronOptions = {},
): FakeElectron {
  const windows: FakeBrowserWindow[] = [];
  const menuChanges: string[] = [];
  const sandboxCalls: SandboxCall[] = [];
  let quits = 0;
  let isReady = false;
  let resolveReady: () => void = () => undefined;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const app = Object.assign(new EventEmitter(), {
    isPackaged: options.isPackaged ?? false,
    getAppPath: () => options.appPath ?? DEFAULT_APP_PATH,
    isReady: () => isReady,
    whenReady: () => readyPromise,
    enableSandbox: () => {
      sandboxCalls.push(isReady ? 'after-ready' : 'before-ready');
    },
    quit: () => {
      quits += 1;
    },
  });

  function openWindows(): FakeBrowserWindow[] {
    return windows.filter((window) => !window.isDestroyed());
  }

  class BrowserWindow extends EventEmitter implements FakeBrowserWindow {
    readonly options: WindowOptions;
    private visible: boolean;
    private title: string;
    private page: LoadedPage | undefined;
    private destroyed = false;

    constructor(windowOptions: WindowOptions = {}) {
      super();
      this.options = windowOptions;
      // Electron shows a new window unless `show: false`.
      this.visible = windowOptions.show !== false;
      this.title = windowOptions.title ?? '';
      if (windowOptions.autoHideMenuBar === true) {
        menuChanges.push('autoHideMenuBar');
      }
      windows.push(this);
    }

    static getAllWindows(): FakeBrowserWindow[] {
      return openWindows();
    }

    isVisible(): boolean {
      return this.visible;
    }

    getTitle(): string {
      return this.title;
    }

    setTitle(title: string): void {
      this.title = title;
    }

    show(): void {
      this.visible = true;
    }

    showInactive(): void {
      this.visible = true;
    }

    hide(): void {
      this.visible = false;
    }

    loadFile(path: string): Promise<void> {
      this.page = { kind: 'file', path };
      return Promise.resolve();
    }

    loadURL(url: string): Promise<void> {
      this.page = { kind: 'url', url };
      return Promise.resolve();
    }

    loadedPage(): LoadedPage | undefined {
      return this.page;
    }

    setMenu(): void {
      menuChanges.push('window.setMenu');
    }

    removeMenu(): void {
      menuChanges.push('window.removeMenu');
    }

    setMenuBarVisibility(): void {
      menuChanges.push('window.setMenuBarVisibility');
    }

    setAutoHideMenuBar(): void {
      menuChanges.push('window.setAutoHideMenuBar');
    }

    close(): void {
      if (this.destroyed) {
        return;
      }
      this.emit('close');
      this.destroyed = true;
      this.visible = false;
      this.emit('closed');
      if (openWindows().length === 0) {
        app.emit('window-all-closed');
      }
    }

    isDestroyed(): boolean {
      return this.destroyed;
    }

    emitReadyToShow(): void {
      this.emit('ready-to-show');
    }
  }

  const Menu: FakeMenu = {
    setApplicationMenu: () => {
      menuChanges.push('Menu.setApplicationMenu');
    },
    buildFromTemplate: (template) => {
      menuChanges.push('Menu.buildFromTemplate');
      return template;
    },
    getApplicationMenu: () => null,
  };

  // Electron's `screen` cannot be used before the app is ready.
  const screen: FakeScreen = {
    getPrimaryDisplay: () => {
      if (!isReady) {
        throw new Error('screen cannot be used before the app is ready');
      }
      return { workArea: options.workArea ?? DEFAULT_WORK_AREA };
    },
  };

  return {
    electron: { app, BrowserWindow, Menu, screen },
    app,
    windows,
    menuChanges,
    sandboxCalls,
    quitCount: () => quits,
    ready: async () => {
      isReady = true;
      resolveReady();
      app.emit('ready');
      await flushPromises();
    },
  };
}
