// The Contract: every Channel the page may send on, with its request and
// response. It imports nothing.

export type AppInfo = { version: string };

export type ChannelMap = {
  'app:info': { request: undefined; response: AppInfo };
};

export type Channel = keyof ChannelMap;

// The runtime list of the Channels; a missing one fails the type check.
const CHANNEL_SET = {
  'app:info': true,
} as const satisfies Record<Channel, true>;

export const CHANNELS = Object.keys(CHANNEL_SET) as Channel[];

export function isChannel(value: unknown): value is Channel {
  return typeof value === 'string' && CHANNELS.includes(value as Channel);
}

// What the Preload exposes to the page as `window.dashcash`.
export type DashCashBridge = {
  invoke<C extends Channel>(
    channel: C,
    request: ChannelMap[C]['request'],
  ): Promise<ChannelMap[C]['response']>;
};
