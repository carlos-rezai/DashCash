const TITLE = "DashCash couldn't start";

// The Startup error (design log Q34, A5): a native error box with the cause, a
// blank line and the Data folder; then the app quits.
export function showStartupError(
  dialog: { showErrorBox(title: string, content: string): void },
  app: { quit(): void },
  cause: string,
  folder: string,
): void {
  dialog.showErrorBox(TITLE, `${cause}\n\nData folder: ${folder}`);
  app.quit();
}
