export const WINDOW_TITLE = 'DashCash';

// The App build's page, served through the App protocol.
const APP_INDEX_URL = 'app://dashcash/index.html';

const WINDOW_WIDTH = 1440;
const WINDOW_HEIGHT = 900;

// The Secure defaults (design log Q15), set explicitly so they never depend
// on Electron's defaults.
const SECURE_WEB_PREFERENCES = {
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  webviewTag: false,
  spellcheck: false,
};

// The parts of an Electron BrowserWindow the main window uses, so the module
// takes its Electron objects as parameters (A1).
export type MainWindow = {
  once(event: 'ready-to-show', listener: () => void): unknown;
  show(): void;
  loadURL(url: string): Promise<void>;
};

export type WorkArea = { width: number; height: number };

export type WindowSize = { width: number; height: number };

export type MainWindowConstructor<Window extends MainWindow> = new (options: {
  show: boolean;
  title: string;
  width: number;
  height: number;
  useContentSize: boolean;
  webPreferences: typeof SECURE_WEB_PREFERENCES;
}) => Window;

export type MainWindowOptions = {
  // Set in dev: the page comes from the dev server instead.
  devServerUrl: string | undefined;
  // The primary display's work area, which caps the window's size.
  workArea: WorkArea;
};

// 1440 x 900, each side capped on its own at the work area.
export function fitWindowSize(workArea: WorkArea): WindowSize {
  return {
    width: Math.min(WINDOW_WIDTH, workArea.width),
    height: Math.min(WINDOW_HEIGHT, workArea.height),
  };
}

export function createMainWindow<Window extends MainWindow>(
  BrowserWindow: MainWindowConstructor<Window>,
  { devServerUrl, workArea }: MainWindowOptions,
): Window {
  const window = new BrowserWindow({
    show: false,
    title: WINDOW_TITLE,
    ...fitWindowSize(workArea),
    useContentSize: true,
    webPreferences: SECURE_WEB_PREFERENCES,
  });
  window.once('ready-to-show', () => {
    window.show();
  });
  if (devServerUrl === undefined) {
    void window.loadURL(APP_INDEX_URL);
  } else {
    void window.loadURL(devServerUrl);
  }
  return window;
}
