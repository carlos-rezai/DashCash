// The parts of the main window a second start brings to the front.
export type FocusableWindow = {
  isMinimized(): boolean;
  restore(): void;
  focus(): void;
};

type SingleInstanceApp = {
  requestSingleInstanceLock(): boolean;
  on(event: 'second-instance', listener: () => void): unknown;
  quit(): void;
};

// Requests the Single-instance lock and tells whether this process holds it;
// the app quits when another process does. When a second process starts, the
// window is restored if minimised and focused, or left alone when there is no
// window yet.
export function lockSingleInstance(
  app: SingleInstanceApp,
  getWindow: () => FocusableWindow | undefined,
): boolean {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return false;
  }
  app.on('second-instance', () => {
    const window = getWindow();
    if (window === undefined) {
      return;
    }
    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();
  });
  return true;
}
