import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as contractByName from '@dashcash/contract';
import { CHANNELS, isChannel } from './channels.ts';

// The Contract (design log Q19–Q21, Q23): the Channels the page may send on,
// as a runtime list, and the guard the Bridge checks a channel with.

describe('CHANNELS', () => {
  it('lists app:info, the one Channel of 04', () => {
    expect(CHANNELS).toEqual(['app:info']);
  });
});

describe('isChannel', () => {
  it.each(CHANNELS)('accepts the listed Channel %s', (channel) => {
    expect(isChannel(channel)).toBe(true);
  });

  it.each([
    '',
    'app:quit',
    'accounts:list',
    'APP:INFO',
    'app:info ',
    ' app:info',
    'app',
    'app:',
    'toString',
    'constructor',
    '__proto__',
    'hasOwnProperty',
  ])('refuses the string %j', (value) => {
    expect(isChannel(value)).toBe(false);
  });

  it.each([
    { case: 'undefined', value: undefined },
    { case: 'null', value: null },
    { case: 'a number', value: 0 },
    { case: 'a boolean', value: true },
    { case: 'an empty object', value: {} },
    { case: 'an object keyed by the Channel', value: { 'app:info': true } },
    { case: 'an array holding the Channel', value: ['app:info'] },
    { case: 'a String object', value: new String('app:info') },
    { case: 'a symbol', value: Symbol('app:info') },
    { case: 'a function', value: () => 'app:info' },
  ])('refuses $case', ({ value }) => {
    expect(isChannel(value)).toBe(false);
  });
});

describe('the @dashcash/contract package', () => {
  it('resolves by its package name to this module', () => {
    expect(contractByName.isChannel).toBe(isChannel);
    expect(contractByName.CHANNELS).toBe(CHANNELS);
  });

  it('is private and an ES module package', () => {
    const manifest: unknown = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    );

    expect(manifest).toMatchObject({
      name: '@dashcash/contract',
      private: true,
      type: 'module',
    });
  });
});
