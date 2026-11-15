import { describe, expect, it } from 'vitest';
import { readDevServerUrl } from './readDevServerUrl.ts';

const DEV_URL = 'http://localhost:5173';

describe('readDevServerUrl', () => {
  it('returns ELECTRON_RENDERER_URL when the app is not packaged and the variable is set', () => {
    expect(
      readDevServerUrl(
        { isPackaged: false },
        { ELECTRON_RENDERER_URL: DEV_URL },
      ),
    ).toBe(DEV_URL);
  });

  it.each([
    {
      case: 'packaged with the variable set',
      isPackaged: true,
      env: { ELECTRON_RENDERER_URL: DEV_URL },
    },
    {
      case: 'not packaged with the variable unset',
      isPackaged: false,
      env: {},
    },
    {
      case: 'not packaged with the variable empty',
      isPackaged: false,
      env: { ELECTRON_RENDERER_URL: '' },
    },
    {
      case: 'packaged with the variable unset',
      isPackaged: true,
      env: {},
    },
  ])('returns undefined when $case', ({ isPackaged, env }) => {
    expect(readDevServerUrl({ isPackaged }, env)).toBeUndefined();
  });
});
