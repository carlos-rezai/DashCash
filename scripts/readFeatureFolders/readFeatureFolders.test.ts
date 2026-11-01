import { describe, expect, it } from 'vitest';
import {
  featureFolderPath,
  findFeatureFolder,
  parseFeatureBranch,
} from './readFeatureFolders.ts';

describe('parseFeatureBranch', () => {
  it.each([
    {
      branch: 'feat/01-csv-import',
      expected: {
        kind: 'feat',
        folder: '01-csv-import',
        feature: 'csv-import',
      },
    },
    {
      branch: 'refactor/12-csv-import',
      expected: {
        kind: 'refactor',
        folder: '12-csv-import',
        feature: 'csv-import',
      },
    },
  ])('reads $branch', ({ branch, expected }) => {
    expect(parseFeatureBranch(branch)).toEqual(expected);
  });

  it.each([
    'main',
    'renovate/lodash-4.x',
    'feat/csv-import',
    'feat/01-',
    'fix/01-csv-import',
    'xfeat/01-csv-import',
    '',
    undefined,
  ])('does not read %s', (branch) => {
    expect(parseFeatureBranch(branch)).toBeUndefined();
  });
});

describe('featureFolderPath', () => {
  it('puts the folder under docs/features', () => {
    expect(featureFolderPath('01-sample')).toBe('docs/features/01-sample');
  });
});

describe('findFeatureFolder', () => {
  const tracked = [
    'docs/features/01-sample/prd.md',
    'docs/features/02-other/01-slice.md',
    'docs/features/draft/01-slice.md',
    'docs/features-old/03-old/01-slice.md',
    'README.md',
  ];

  it('finds the numbered folder of a feature', () => {
    expect(findFeatureFolder('sample', tracked)).toBe('01-sample');
    expect(findFeatureFolder('other', tracked)).toBe('02-other');
  });

  it('finds nothing for an unnumbered folder, a foreign folder or an unknown feature', () => {
    expect(findFeatureFolder('draft', tracked)).toBeUndefined();
    expect(findFeatureFolder('old', tracked)).toBeUndefined();
    expect(findFeatureFolder('missing', tracked)).toBeUndefined();
  });
});
