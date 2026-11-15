// The dev server URL electron-vite hands the app in ELECTRON_RENDERER_URL, in
// dev only: a packaged app never loads from a dev server.
export function readDevServerUrl(
  app: { readonly isPackaged: boolean },
  env: Readonly<Record<string, string | undefined>>,
): string | undefined {
  const url = env['ELECTRON_RENDERER_URL'];
  if (app.isPackaged || url === undefined || url === '') {
    return undefined;
  }
  return url;
}
