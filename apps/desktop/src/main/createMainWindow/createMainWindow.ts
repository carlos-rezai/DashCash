export const WINDOW_TITLE = 'DashCash';

// The parts of an Electron BrowserWindow the main window uses, so the module
// takes its Electron objects as parameters (A1).
export type MainWindow = {
  once(event: 'ready-to-show', listener: () => void): unknown;
  show(): void;
  loadFile(path: string): Promise<void>;
  loadURL(url: string): Promise<void>;
};

export type MainWindowConstructor<Window extends MainWindow> = new (options: {
  show: boolean;
  title: string;
}) => Window;

export type MainWindowOptions = {
  // The built renderer page, loaded as a file.
  indexFile: string;
  // Set in dev: the page comes from the dev server instead.
  devServerUrl: string | undefined;
};

export function createMainWindow<Window extends MainWindow>(
  BrowserWindow: MainWindowConstructor<Window>,
  { indexFile, devServerUrl }: MainWindowOptions,
): Window {
  const window = new BrowserWindow({ show: false, title: WINDOW_TITLE });
  window.once('ready-to-show', () => {
    window.show();
  });
  if (devServerUrl === undefined) {
    void window.loadFile(indexFile);
  } else {
    void window.loadURL(devServerUrl);
  }
  return window;
}
