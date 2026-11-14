import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from './migrations.ts';

describe('MIGRATIONS', () => {
  it('is empty in 04: no table exists yet', () => {
    expect(MIGRATIONS).toStrictEqual([]);
  });
});
