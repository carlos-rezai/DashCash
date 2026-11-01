import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// .github/CODEOWNERS: the owner for everything, and explicitly for every gate
// file of CLAUDE.md's "Ask first" list and for .claude/.

type OwnerRule = { pattern: string; owners: string[] };

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const OWNER = '@carlos-rezai';

// The gate files of CLAUDE.md's "Ask first" list, as CODEOWNERS patterns. The
// verify* and test* scripts live in package.json.
const GATE_FILE_PATTERNS = [
  '.github/',
  'eslint.config.*',
  '.prettierrc*',
  'tsconfig*.json',
  '.dependency-cruiser.*',
  'vitest.config.*',
  'playwright.config.*',
  'stryker.config.*',
  'quality/',
  'package.json',
];

function readOwnerRules(): OwnerRule[] {
  const text = readFileSync(join(ROOT, '.github/CODEOWNERS'), 'utf8');
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const [pattern = '', ...owners] = line.split(/\s+/);
      return { pattern, owners };
    });
}

// A pattern anchored at the root (leading "/") and one that matches a whole
// folder ("folder/**") name the same root file or folder.
function normalisePattern(pattern: string): string {
  return pattern.replace(/^\//, '').replace(/\*\*$/, '');
}

function ownersOf(rules: OwnerRule[], pattern: string): string[] | undefined {
  return rules.find((rule) => normalisePattern(rule.pattern) === pattern)
    ?.owners;
}

describe('CODEOWNERS', () => {
  it('owns everything through *', () => {
    expect(ownersOf(readOwnerRules(), '*')).toEqual([OWNER]);
  });

  it.each(GATE_FILE_PATTERNS)('owns the gate file %s explicitly', (pattern) => {
    expect(ownersOf(readOwnerRules(), pattern)).toEqual([OWNER]);
  });

  it('owns .claude/ explicitly', () => {
    expect(ownersOf(readOwnerRules(), '.claude/')).toEqual([OWNER]);
  });

  it('names no owner but the repository owner', () => {
    const rules = readOwnerRules();

    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.owners, rule.pattern).toEqual([OWNER]);
    }
  });
});
