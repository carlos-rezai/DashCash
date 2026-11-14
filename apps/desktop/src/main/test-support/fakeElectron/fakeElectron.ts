import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// A fake of the Electron objects main's modules take as parameters (A1):
// `app`, `BrowserWindow`, `Menu`, `screen`, `protocol`, `net`, `session` and
// `ipcMain`.
// It records what a module does with them (windows created, shown, loaded,
// closed; quits; menu changes; the sandbox enabled; schemes and protocol
// handlers registered; the order of the startup calls) so a test can assert
// behaviour without Electron. Its `net.fetch` serves `file:` URLs from the
// disk, as Electron's does. Its web contents and default session act as the
// page would (navigate, redirect, open a window, attach a webview, ask for a
// permission) and answer as Electron does: allowed unless a listener or
// handler says otherwise. Its `invoke` sends a request on a channel as the
// page's `ipcRenderer.invoke` would, and settles as Electron settles it.

export type FakeElectronOptions = {
  isPackaged?: boolean;
  appPath?: string;
  // What `app.getVersion()` returns; an invented version unless given.
  version?: string;
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
  | 'session.setPermissionRequestHandler'
  | 'session.setPermissionCheckHandler'
  | 'ipcMain.handle'
  | 'new BrowserWindow';

// The event Electron hands an `ipcMain.handle` listener: the frame that sent
// the request.
export type FakeIpcMainInvokeEvent = {
  senderFrame: { url: string; origin: string } | null;
};

export type IpcMainHandler = (
  event: FakeIpcMainInvokeEvent,
  ...args: unknown[]
) => unknown;

// One call of `ipcMain.handle`.
export type IpcHandlerCall = { channel: string; when: ReadyPhase };

type FakeIpcMain = {
  handle(channel: string, listener: IpcMainHandler): void;
};

// What Electron does with a navigation, a redirect or a webview: it goes
// ahead unless a listener calls `event.preventDefault()`.
export type PageOutcome = 'allowed' | 'prevented';

// The answer of a window open handler, as Electron takes it.
export type WindowOpenResponse = { action: 'allow' | 'deny' };

type WindowOpenHandler = (details: {
  url: string;
  frameName: string;
  features: string;
  disposition: string;
}) => WindowOpenResponse;

// The web contents of a window or a webview, as the page drives it.
export type FakeWebContents = EventEmitter & {
  setWindowOpenHandler(handler: WindowOpenHandler): void;
  // The page navigates its main frame to `url` (`will-navigate`).
  navigate(url: string): PageOutcome;
  // A navigation of the main frame is redirected to `url` (`will-redirect`).
  redirect(url: string): PageOutcome;
  // The page opens `url` in a new window (`window.open`, a link with a
  // target); Electron allows it when no handler is set.
  openWindow(url: string): WindowOpenResponse;
  // The page attaches a `<webview>` showing `src` (`will-attach-webview`).
  attachWebview(src: string): PageOutcome;
};

type PermissionRequestHandler = (
  webContents: FakeWebContents,
  permission: string,
  callback: (granted: boolean) => void,
  details: { requestingUrl: string; isMainFrame: boolean },
) => void;

type PermissionCheckHandler = (
  webContents: FakeWebContents | null,
  permission: string,
  requestingOrigin: string,
  details: { requestingUrl?: string; isMainFrame?: boolean },
) => boolean;

type FakeSession = {
  setPermissionRequestHandler(handler: PermissionRequestHandler | null): void;
  setPermissionCheckHandler(handler: PermissionCheckHandler | null): void;
};

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
  readonly webContents: FakeWebContents;
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
    session: { defaultSession: FakeSession };
    ipcMain: FakeIpcMain;
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
  // Every call of `ipcMain.handle`, in order.
  ipcHandlers: IpcHandlerCall[];
  // The page at app://dashcash/index.html calls `ipcRenderer.invoke(channel,
  // ...args)`. As in Electron, it resolves with what the channel's handler
  // returns or resolves, rejects with "Error invoking remote method" and the
  // handler's error when it throws or rejects, and rejects when no handler is
  // registered for the channel.
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  // As `invoke`, but sent from `senderFrame`: a frame at another URL, or
  // `null` when the frame is gone (navigated away or destroyed), as Electron
  // hands it to the listener.
  invokeFrom(
    senderFrame: FakeIpcMainInvokeEvent['senderFrame'],
    channel: string,
    ...args: unknown[]
  ): Promise<unknown>;
  // Sends a request for `url` to the handler registered for its scheme, as
  // the page would; `undefined` when no handler is registered for it.
  request(url: string): Promise<Response | undefined>;
  // Creates web contents as Electron does for a window or a webview, and
  // emits the app's `web-contents-created` for it.
  createWebContents(): FakeWebContents;
  // The page at `requestingUrl` asks the default session for `permission`;
  // resolves whether it was granted. Electron grants it when no handler is
  // set.
  requestPermission(
    permission: string,
    requestingUrl: string,
    webContents?: FakeWebContents,
  ): Promise<boolean>;
  // Chromium checks whether `requestingOrigin` holds `permission` in the
  // default session. Electron grants it when no handler is set.
  checkPermission(
    permission: string,
    requestingOrigin: string,
    webContents?: FakeWebContents | null,
  ): boolean;
  // How often `app.quit()` was called.
  quitCount(): number;
  // Makes the app ready: resolves `whenReady()`, emits `ready`, and lets
  // pending promise callbacks run.
  ready(): Promise<void>;
};

type FakeApp = EventEmitter & {
  readonly isPackaged: boolean;
  getAppPath(): string;
  getVersion(): string;
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
const DEFAULT_VERSION = '0.0.0-invented';

// The page the fake's `invoke` sends from.
const PAGE_URL = 'app://dashcash/index.html';
const PAGE_ORIGIN = 'app://dashcash';
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
  const ipcHandlers: IpcHandlerCall[] = [];
  const ipcListeners = new Map<string, IpcMainHandler>();
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
    getVersion: () => options.version ?? DEFAULT_VERSION,
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

  // Emits an event a listener may prevent, and tells whether one did.
  function emitPreventable(
    contents: EventEmitter,
    eventName: string,
    fields: Readonly<Record<string, unknown>>,
    ...rest: unknown[]
  ): PageOutcome {
    const state = { prevented: false };
    const event = {
      ...fields,
      preventDefault: () => {
        state.prevented = true;
      },
    };
    contents.emit(eventName, event, ...rest);
    return state.prevented ? 'prevented' : 'allowed';
  }

  // A navigation-like event: Electron passes an event carrying the URL, and
  // the URL again as the second argument.
  function emitNavigation(
    contents: EventEmitter,
    eventName: 'will-navigate' | 'will-redirect',
    url: string,
  ): PageOutcome {
    return emitPreventable(
      contents,
      eventName,
      { url, isMainFrame: true },
      url,
      false,
      true,
    );
  }

  function createWebContents(): FakeWebContents {
    const windowOpenHandler: { handler?: WindowOpenHandler } = {};
    const contents: FakeWebContents = Object.assign(new EventEmitter(), {
      setWindowOpenHandler: (handler: WindowOpenHandler) => {
        windowOpenHandler.handler = handler;
      },
      navigate: (url: string) => emitNavigation(contents, 'will-navigate', url),
      redirect: (url: string) => emitNavigation(contents, 'will-redirect', url),
      openWindow: (url: string): WindowOpenResponse =>
        windowOpenHandler.handler === undefined
          ? { action: 'allow' }
          : windowOpenHandler.handler({
              url,
              frameName: '',
              features: '',
              disposition: 'new-window',
            }),
      attachWebview: (src: string): PageOutcome =>
        emitPreventable(contents, 'will-attach-webview', {}, {}, { src }),
    });
    app.emit(
      'web-contents-created',
      { preventDefault: () => undefined },
      contents,
    );
    return contents;
  }

  let permissionRequestHandler: PermissionRequestHandler | null = null;
  let permissionCheckHandler: PermissionCheckHandler | null = null;

  const defaultSession: FakeSession = {
    setPermissionRequestHandler: (handler) => {
      startupCalls.push('session.setPermissionRequestHandler');
      permissionRequestHandler = handler;
    },
    setPermissionCheckHandler: (handler) => {
      startupCalls.push('session.setPermissionCheckHandler');
      permissionCheckHandler = handler;
    },
  };

  class BrowserWindow extends EventEmitter implements FakeBrowserWindow {
    readonly options: WindowOptions;
    readonly webContents: FakeWebContents;
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
      this.webContents = createWebContents();
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

  // Electron allows one handler per channel and refuses a second.
  const ipcMain: FakeIpcMain = {
    handle: (channel, listener) => {
      if (ipcListeners.has(channel)) {
        throw new Error(
          `Attempted to register a second handler for '${channel}'`,
        );
      }
      startupCalls.push('ipcMain.handle');
      ipcHandlers.push({ channel, when: readyPhase() });
      ipcListeners.set(channel, listener);
    },
  };

  // Electron runs the listener in main and hands the page its result; an
  // error crosses as its string, prefixed with the channel.
  async function invokeFrom(
    senderFrame: FakeIpcMainInvokeEvent['senderFrame'],
    channel: string,
    ...args: unknown[]
  ): Promise<unknown> {
    const listener = ipcListeners.get(channel);
    if (listener === undefined) {
      throw new Error(
        `Error invoking remote method '${channel}': Error: No handler registered for '${channel}'`,
      );
    }
    try {
      return await listener({ senderFrame }, ...args);
    } catch (error) {
      throw new Error(
        `Error invoking remote method '${channel}': ${String(error)}`,
        { cause: error },
      );
    }
  }

  function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    return invokeFrom({ url: PAGE_URL, origin: PAGE_ORIGIN }, channel, ...args);
  }

  return {
    electron: {
      app,
      BrowserWindow,
      Menu,
      screen,
      protocol,
      net,
      session: { defaultSession },
      ipcMain,
    },
    app,
    windows,
    menuChanges,
    sandboxCalls,
    privilegedSchemes,
    protocolHandlers,
    startupCalls,
    ipcHandlers,
    invoke,
    invokeFrom,
    request: async (url) => {
      const scheme = url.slice(0, url.indexOf(':'));
      const handler = handlers.get(scheme);
      if (handler === undefined) {
        return undefined;
      }
      return handler(new Request(url));
    },
    createWebContents,
    requestPermission: (permission, requestingUrl, webContents) => {
      const handler = permissionRequestHandler;
      if (handler === null) {
        return Promise.resolve(true);
      }
      return new Promise<boolean>((resolve) => {
        handler(
          webContents ?? createWebContents(),
          permission,
          (granted) => {
            resolve(granted);
          },
          { requestingUrl, isMainFrame: true },
        );
      });
    },
    checkPermission: (permission, requestingOrigin, webContents = null) => {
      if (permissionCheckHandler === null) {
        return true;
      }
      return permissionCheckHandler(webContents, permission, requestingOrigin, {
        requestingUrl: `${requestingOrigin}/`,
        isMainFrame: true,
      });
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
