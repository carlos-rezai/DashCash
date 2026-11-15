import { describe, expect, it } from 'vitest';
import {
  isChannel,
  type Channel,
  type DashCashBridge,
} from '@dashcash/contract';
import { createBridge } from './createBridge.ts';

// The Bridge the Preload exposes (design log Q21, A1): `invoke` sends a
// request on a Channel the Contract lists, through the `invoke` it is given,
// and refuses any other channel without sending it.

const INVENTED_RESPONSE = { version: '9.8.7-invented' };

function fakeInvoke() {
  const calls: unknown[][] = [];
  const invoke = (channel: string, ...args: unknown[]): Promise<unknown> => {
    calls.push([channel, ...args]);
    return Promise.resolve(INVENTED_RESPONSE);
  };
  return { invoke, calls };
}

// The page is untrusted code: it may call `invoke` with any channel and any
// request, whatever the Contract's types say.
type PageView = {
  invoke(channel: unknown, request?: unknown): Promise<unknown>;
};

function asPage(bridge: DashCashBridge): PageView {
  return bridge;
}

describe('createBridge', () => {
  it('forwards a listed Channel and resolves with what invoke answers', async () => {
    const { invoke, calls } = fakeInvoke();
    const bridge = createBridge(invoke, isChannel);

    await expect(bridge.invoke('app:info', undefined)).resolves.toEqual(
      INVENTED_RESPONSE,
    );
    expect(calls.map(([channel]) => channel)).toEqual(['app:info']);
  });

  it('forwards the request unchanged, as the page sent it', async () => {
    const { invoke, calls } = fakeInvoke();
    const page = asPage(createBridge(invoke, isChannel));

    await page.invoke('app:info', { invented: 'request' });

    expect(calls).toEqual([['app:info', { invented: 'request' }]]);
  });

  it.each([
    { case: 'an unlisted channel', channel: 'app:quit' },
    { case: 'a listed channel in other case', channel: 'APP:INFO' },
    { case: 'an empty channel', channel: '' },
    { case: 'a name on Object.prototype', channel: 'toString' },
    { case: 'a number', channel: 42 },
  ])(
    'rejects $case with "Unknown channel: <channel>" and never calls invoke',
    async ({ channel }) => {
      const { invoke, calls } = fakeInvoke();
      const page = asPage(createBridge(invoke, isChannel));

      await expect(page.invoke(channel, undefined)).rejects.toEqual(
        new Error(`Unknown channel: ${String(channel)}`),
      );
      expect(calls).toEqual([]);
    },
  );

  it('refuses an unknown channel with a rejected promise, not a throw', async () => {
    const { invoke } = fakeInvoke();
    const page = asPage(createBridge(invoke, isChannel));
    let result: Promise<unknown> | undefined;

    expect(() => {
      result = page.invoke('app:quit', undefined);
    }).not.toThrow();
    await expect(result).rejects.toEqual(
      new Error('Unknown channel: app:quit'),
    );
  });

  it('refuses whatever the isChannel it is given refuses, even a listed Channel', async () => {
    const { invoke, calls } = fakeInvoke();
    const refuseAll = (value: unknown): value is Channel =>
      value === 'never-a-channel';
    const bridge = createBridge(invoke, refuseAll);

    await expect(bridge.invoke('app:info', undefined)).rejects.toEqual(
      new Error('Unknown channel: app:info'),
    );
    expect(calls).toEqual([]);
  });
});
