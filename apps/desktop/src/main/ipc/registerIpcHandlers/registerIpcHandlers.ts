import { CHANNELS, type Channel, type ChannelMap } from '@dashcash/contract';
import { isAppOrigin } from '../../matchAppOrigin/matchAppOrigin.ts';

// One handler per Channel: a missing one fails the type check.
export type IpcHandlers = {
  [C in Channel]: (
    request: ChannelMap[C]['request'],
  ) => ChannelMap[C]['response'] | Promise<ChannelMap[C]['response']>;
};

// The part of Electron's IPC event the Sender check reads: the frame that
// sent the request, `null` when it is gone.
export type IpcSenderEvent = {
  senderFrame: { url: string; origin: string } | null;
};

export type IpcMainElectron = {
  handle(
    channel: string,
    listener: (event: IpcSenderEvent, ...args: unknown[]) => unknown,
  ): void;
};

// The Sender check (design log Q27, A5): only a frame whose URL is on one of
// the App origins passes. A missing frame is refused too, never let through.
// The refusal names the frame's own origin, not one parsed from its URL.
function checkSender(
  channel: string,
  event: IpcSenderEvent,
  origins: readonly string[],
): void {
  const frame = event.senderFrame;
  if (frame !== null && isAppOrigin(frame.url, origins)) {
    return;
  }
  throw new Error(
    `Refused ${channel} from ${frame === null ? 'no frame' : frame.origin}`,
  );
}

// Registers each handler with `ipcMain.handle`, handing it the page's request
// and not the IPC event, after the Sender check against the App origins. A
// handler that throws rejects the page's promise.
export function registerIpcHandlers(
  ipcMain: IpcMainElectron,
  handlers: IpcHandlers,
  origins: readonly string[],
): void {
  for (const channel of CHANNELS) {
    const handler = handlers[channel] as (request: unknown) => unknown;
    ipcMain.handle(channel, (event, request) => {
      checkSender(channel, event, origins);
      return handler(request);
    });
  }
}
