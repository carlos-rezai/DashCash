import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The App protocol (design log Q16): the scheme `app`, origin
// `app://dashcash`, serves the built renderer folder and nothing else.
const SCHEME = 'app';

const NOT_FOUND = 404;

// A drive prefix such as `C:`, which names another drive on Windows.
const DRIVE_PREFIX = /^[a-zA-Z]:/;

type ProtocolHandler = (request: Request) => Response | Promise<Response>;

// The parts of Electron the protocol uses, so the module takes them as
// parameters (A1).
export type AppProtocolElectron = {
  app: { whenReady(): Promise<void> };
  protocol: {
    registerSchemesAsPrivileged(
      schemes: {
        scheme: string;
        privileges: { standard: boolean; secure: boolean };
      }[],
    ): void;
    handle(scheme: string, handler: ProtocolHandler): void;
  };
  net: { fetch(url: string): Promise<Response> };
};

// The path of the file `url` names inside `rendererFolder`, or `undefined`
// for any path that resolves outside it: `..`, encoded `..`, absolute paths
// and paths on another drive or root, on every platform.
export function resolveRendererPath(
  rendererFolder: string,
  url: string,
): string | undefined {
  let requested: string;
  try {
    requested = decodeURIComponent(new URL(url).pathname).slice(1);
  } catch {
    return undefined;
  }
  if (
    requested.includes('\\') ||
    requested.startsWith('/') ||
    DRIVE_PREFIX.test(requested)
  ) {
    return undefined;
  }
  const path = resolve(join(rendererFolder, requested));
  const fromFolder = relative(resolve(rendererFolder), path);
  if (
    fromFolder === '' ||
    isAbsolute(fromFolder) ||
    fromFolder.split(/[\\/]/).includes('..')
  ) {
    return undefined;
  }
  return path;
}

// Registers the scheme before the app is ready, as Electron requires, and its
// handler once it is.
export function registerAppProtocol(
  { app, protocol, net }: AppProtocolElectron,
  rendererFolder: string,
): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true } },
  ]);
  void app.whenReady().then(() => {
    protocol.handle(SCHEME, (request) => {
      const path = resolveRendererPath(rendererFolder, request.url);
      if (path === undefined) {
        return new Response(null, { status: NOT_FOUND });
      }
      return net.fetch(pathToFileURL(path).toString());
    });
  });
}
