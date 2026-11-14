import { CHANNELS, type Channel, type ChannelMap } from '@dashcash/contract';

// One handler per Channel: a missing one fails the type check.
export type IpcHandlers = {
  [C in Channel]: (
    request: ChannelMap[C]['request'],
  ) => ChannelMap[C]['response'] | Promise<ChannelMap[C]['response']>;
};

export type IpcMainElectron = {
  handle(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => unknown,
  ): void;
};

// Registers each handler with `ipcMain.handle`, handing it the page's request
// and not the IPC event. A handler that throws rejects the page's promise.
export function registerIpcHandlers(
  ipcMain: IpcMainElectron,
  handlers: IpcHandlers,
): void {
  for (const channel of CHANNELS) {
    const handler = handlers[channel] as (request: unknown) => unknown;
    ipcMain.handle(channel, (_event, request) => handler(request));
  }
}
