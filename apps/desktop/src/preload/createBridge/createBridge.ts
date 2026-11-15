import type { Channel, DashCashBridge } from '@dashcash/contract';

type Invoke = (channel: string, ...args: unknown[]) => Promise<unknown>;

// The Bridge the Preload exposes: sends a request on a Channel the Contract
// lists, and refuses any other channel without sending it.
export function createBridge(
  invoke: Invoke,
  isChannel: (value: unknown) => value is Channel,
): DashCashBridge {
  return {
    invoke: (async (channel: unknown, request: unknown) => {
      if (!isChannel(channel)) {
        throw new Error(`Unknown channel: ${String(channel)}`);
      }
      return invoke(channel, request);
    }) as DashCashBridge['invoke'],
  };
}
