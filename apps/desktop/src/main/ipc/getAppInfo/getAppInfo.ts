import type { AppInfo } from '@dashcash/contract';

// The `app:info` Channel's answer: the App version. It takes no request.
export function getAppInfo(app: { getVersion(): string }): AppInfo {
  return { version: app.getVersion() };
}
