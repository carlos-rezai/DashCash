// The App origins (design log I2): `app://dashcash`, plus the dev server's
// origin when `readDevServerUrl` gave one.
const APP_ORIGIN = 'app://dashcash';

// The scheme, host and port of `url`, or `undefined` when it is no URL or
// carries user info (`app://dashcash@evil/` names the host `evil`).
function originKey(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.username !== '' || parsed.password !== '') {
      return undefined;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return undefined;
  }
}

export function listAppOrigins(devServerUrl: string | undefined): string[] {
  if (devServerUrl === undefined) {
    return [APP_ORIGIN];
  }
  return [APP_ORIGIN, new URL(devServerUrl).origin];
}

// Compares the origin of `url` with each App origin exactly.
export function isAppOrigin(url: string, origins: readonly string[]): boolean {
  const key = originKey(url);
  return (
    key !== undefined && origins.some((origin) => originKey(origin) === key)
  );
}
