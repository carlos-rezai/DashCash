import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// A fake of the Electron objects main's modules take as parameters (A1):
// `app`, `BrowserWindow`, `Menu`, `screen`, `protocol` and `net`. It records
// what a module does with them (windows created, shown, loaded, closed;
// quits; menu changes; the sandbox enabled; schemes and protocol handlers
// registered; the order of the startup calls) so a test can assert behaviour
// without Electron. Its `net.fetch` serves `file:` URLs from the disk, as
// Electron's does.

export type FakeElectronOptions = {
  isPackaged?: boolean;
  appPath?: string;
  // The primary display's work area; larger than 1440 × 900 unless given.
  workArea?: WorkArea;
};

export type WorkArea = { x: number; y: number; width: number; height: number };

// When a call happened: before or after the app was ready.
export type ReadyPhase = 'before-ready' | 'after-ready';

// When `app.enableSandbox()` was called: before or after the app was ready.
export type SandboxCall = ReadyPhase;

// One entry of `protocol.registerSchemesAsPrivileged`, as Electron takes it.
export type PrivilegedScheme = {
  scheme: string;
  privileges?: Readonly<Record<string, boolean | undefined>>;
};

// One call of `protocol.registerSchemesAsPrivileged`.
export type PrivilegedSchemesCall = {
  schemes: PrivilegedScheme[];
  when: ReadyPhase;
};

export type ProtocolHandler = (
  request: Request,
) => Response | Promise<Response>;

// One call of `protocol.handle`.
export type ProtocolHandlerCall = { scheme: string; when: ReadyPhase };

// The startup calls whose order the design log fixes, as `startupCalls`
// records them; `ready` is the moment the app became ready.
export type StartupCall =
  | 'app.enableSandbox'
  | 'protocol.registerSchemesAsPrivileged'
  | 'ready'
  | 'protocol.handle'
  | 'new BrowserWindow';

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
  // The page loaded last.
  loadedPage(): LoadedPage | undefined;
  // Every page load, in order.
  pageLoads(): LoadedPage[];
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
    protocol: FakeProtocol;
    net: FakeNet;
  };
  app: FakeApp;
  // Every window created, in order, closed ones included.
  windows: FakeBrowserWindow[];
  // Every change to a menu, application or window, as `<call>`.
  menuChanges: string[];
  // Every call of `app.enableSandbox()`, in order.
  sandboxCalls: SandboxCall[];
  // Every call of `protocol.registerSchemesAsPrivileged`, in order.
  privilegedSchemes: PrivilegedSchemesCall[];
  // Every call of `protocol.handle`, in order.
  protocolHandlers: ProtocolHandlerCall[];
  // The startup calls, in the order they happened.
  startupCalls: StartupCall[];
  // Sends a request for `url` to the handler registered for its scheme, as
  // the page would; `undefined` when no handler is registered for it.
  request(url: string): Promise<Response | undefined>;
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

type FakeProtocol = {
  registerSchemesAsPrivileged(schemes: PrivilegedScheme[]): void;
  handle(scheme: string, handler: ProtocolHandler): void;
};

type FakeNet = {
  fetch(input: string | Request): Promise<Response>;
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
  const privilegedSchemes: PrivilegedSchemesCall[] = [];
  const protocolHandlers: ProtocolHandlerCall[] = [];
  const handlers = new Map<string, ProtocolHandler>();
  const startupCalls: StartupCall[] = [];
  let quits = 0;
  let isReady = false;
  let resolveReady: () => void = () => undefined;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  function readyPhase(): ReadyPhase {
    return isReady ? 'after-ready' : 'before-ready';
  }

  const app = Object.assign(new EventEmitter(), {
    isPackaged: options.isPackaged ?? false,
    getAppPath: () => options.appPath ?? DEFAULT_APP_PATH,
    isReady: () => isReady,
    whenReady: () => readyPromise,
    enableSandbox: () => {
      startupCalls.push('app.enableSandbox');
      sandboxCalls.push(readyPhase());
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
    private readonly pages: LoadedPage[] = [];
    private destroyed = false;

    constructor(windowOptions: WindowOptions = {}) {
      super();
      startupCalls.push('new BrowserWindow');
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
      this.pages.push({ kind: 'file', path });
      return Promise.resolve();
    }

    loadURL(url: string): Promise<void> {
      this.pages.push({ kind: 'url', url });
      return Promise.resolve();
    }

    loadedPage(): LoadedPage | undefined {
      return this.pages.at(-1);
    }

    pageLoads(): LoadedPage[] {
      return [...this.pages];
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

  // Records the calls; Electron itself allows the first only before ready and
  // the second only after it, which the tests assert through `when`.
  const protocol: FakeProtocol = {
    registerSchemesAsPrivileged: (schemes) => {
      startupCalls.push('protocol.registerSchemesAsPrivileged');
      privilegedSchemes.push({ schemes, when: readyPhase() });
    },
    handle: (scheme, handler) => {
      startupCalls.push('protocol.handle');
      protocolHandlers.push({ scheme, when: readyPhase() });
      handlers.set(scheme, handler);
    },
  };

  // Electron's `net.fetch` reads a `file:` URL from the disk and rejects for
  // a missing file; the fake serves nothing else.
  const net: FakeNet = {
    fetch: async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (!url.startsWith('file:')) {
        throw new Error(`The fake net.fetch serves file: URLs only: ${url}`);
      }
      return new Response(await readFile(fileURLToPath(url), 'utf8'));
    },
  };

  return {
    electron: { app, BrowserWindow, Menu, screen, protocol, net },
    app,
    windows,
    menuChanges,
    sandboxCalls,
    privilegedSchemes,
    protocolHandlers,
    startupCalls,
    request: async (url) => {
      const scheme = url.slice(0, url.indexOf(':'));
      const handler = handlers.get(scheme);
      if (handler === undefined) {
        return undefined;
      }
      return handler(new Request(url));
    },
    quitCount: () => quits,
    ready: async () => {
      startupCalls.push('ready');
      isReady = true;
      resolveReady();
      app.emit('ready');
      await flushPromises();
    },
  };
}
