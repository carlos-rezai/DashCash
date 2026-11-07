import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import {
  ROOT,
  writeTreeFile,
} from '../test-support/sampleRepository/sampleRepository.ts';
import { findLicenseViolations } from './checkLicenses.ts';

const ALLOWLIST_FILE = 'quality/license-allowlist.json';

const ALLOWLIST = ['MIT', 'ISC', 'Apache-2.0'];

const MALFORMED_LOCKFILE = {
  subject: 'package-lock.json',
  reason: 'must be an object with a packages object',
};

// A version-3 lockfile with the root entry first, as npm writes it, and the
// given entries after it. Every package here is invented.
function lockfile(packages: Record<string, unknown>): unknown {
  return {
    name: 'sample-app',
    version: '0.0.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: 'sample-app',
        version: '0.0.0',
        license: 'UNLICENSED',
        workspaces: ['apps/*', 'packages/*'],
      },
      ...packages,
    },
  };
}

function disallowed(subject: string, licence: string) {
  return {
    subject,
    reason: `licence "${licence}" is not on the licence allowlist`,
  };
}

function unlicensed(subject: string) {
  return { subject, reason: 'has no licence' };
}

describe('findLicenseViolations', () => {
  describe('licences', () => {
    it('reports nothing for a package with an allowed licence', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/left-pad': { version: '1.3.0', license: 'MIT' },
          'node_modules/@sample/widget': {
            version: '2.0.1',
            license: 'Apache-2.0',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([]);
    });

    it('reports a disallowed licence, naming the package and the licence', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/left-pad': { version: '1.3.0', license: 'MIT' },
          'node_modules/copyleft-kit': {
            version: '4.2.0',
            license: 'GPL-3.0-only',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        disallowed('copyleft-kit@4.2.0', 'GPL-3.0-only'),
      ]);
    });

    it('names a scoped package by its full name', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/@sample/widget': {
            version: '2.0.1',
            license: 'GPL-2.0-only',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        disallowed('@sample/widget@2.0.1', 'GPL-2.0-only'),
      ]);
    });

    it('reports a package without a licence as having none', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/bare-pkg': { version: '0.1.0' },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([unlicensed('bare-pkg@0.1.0')]);
    });

    it('reports a package with a non-string licence as having none', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/object-licence': {
            version: '1.0.0',
            license: { type: 'MIT' },
          },
          'node_modules/array-licence': {
            version: '1.1.0',
            license: ['MIT'],
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        unlicensed('object-licence@1.0.0'),
        unlicensed('array-licence@1.1.0'),
      ]);
    });

    it('reports a package with an empty licence as having none', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/empty-licence': { version: '3.0.0', license: '' },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([unlicensed('empty-licence@3.0.0')]);
    });

    it('compares a licence with the allowlist ids exactly', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/lower-case': { version: '1.0.0', license: 'mit' },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([disallowed('lower-case@1.0.0', 'mit')]);
    });

    it('does not fail on an allowed licence no package uses', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/left-pad': { version: '1.3.0', license: 'MIT' },
        }),
        ['MIT', 'ISC', 'Apache-2.0', 'BlueOak-1.0.0', 'MPL-2.0'],
      );

      expect(violations).toEqual([]);
    });
  });

  describe('SPDX expressions', () => {
    it('passes an OR when one side is allowed and fails it when no side is', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/dual-left': {
            version: '1.0.0',
            license: 'MIT OR GPL-3.0-only',
          },
          'node_modules/dual-right': {
            version: '1.1.0',
            license: 'GPL-3.0-only OR Apache-2.0',
          },
          'node_modules/dual-none': {
            version: '1.2.0',
            license: 'GPL-3.0-only OR SSPL-1.0',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        disallowed('dual-none@1.2.0', 'GPL-3.0-only OR SSPL-1.0'),
      ]);
    });

    it('passes an AND when both sides are allowed and fails it when one is not', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/joint-both': {
            version: '2.0.0',
            license: 'MIT AND ISC',
          },
          'node_modules/joint-one': {
            version: '2.1.0',
            license: 'MIT AND GPL-3.0-only',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        disallowed('joint-one@2.1.0', 'MIT AND GPL-3.0-only'),
      ]);
    });

    it('groups with parentheses, so that moving them changes the result', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/grouped-or-first': {
            version: '3.0.0',
            license: '(ISC OR GPL-3.0-only) AND SSPL-1.0',
          },
          'node_modules/grouped-and-first': {
            version: '3.1.0',
            license: 'ISC OR (GPL-3.0-only AND SSPL-1.0)',
          },
          'node_modules/grouped-nested': {
            version: '3.2.0',
            license: '((MIT OR GPL-3.0-only) AND (ISC OR SSPL-1.0))',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        disallowed(
          'grouped-or-first@3.0.0',
          '(ISC OR GPL-3.0-only) AND SSPL-1.0',
        ),
      ]);
    });

    it('compares a WITH term as a whole against the allowlist', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/with-allowed': {
            version: '4.0.0',
            license: 'ISC AND Apache-2.0 WITH LLVM-exception',
          },
          'node_modules/with-split': {
            version: '4.1.0',
            license: 'ISC AND GPL-2.0-only WITH Classpath-exception-2.0',
          },
        }),
        [...ALLOWLIST, 'Apache-2.0 WITH LLVM-exception', 'GPL-2.0-only'],
      );

      expect(violations).toEqual([
        disallowed(
          'with-split@4.1.0',
          'ISC AND GPL-2.0-only WITH Classpath-exception-2.0',
        ),
      ]);
    });

    it('reads OR and AND as operators in upper case only', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/upper-or': { version: '5.0.0', license: 'MIT OR ISC' },
          'node_modules/upper-and': {
            version: '5.1.0',
            license: 'MIT AND ISC',
          },
          'node_modules/lower-or': { version: '5.2.0', license: 'MIT or ISC' },
          'node_modules/lower-and': {
            version: '5.3.0',
            license: 'MIT and ISC',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        disallowed('lower-or@5.2.0', 'MIT or ISC'),
        disallowed('lower-and@5.3.0', 'MIT and ISC'),
      ]);
    });

    it.each([
      ['an unclosed parenthesis', '(MIT OR ISC'],
      ['an unopened parenthesis', 'MIT OR ISC)'],
      ['a closing parenthesis before its opening one', ')MIT OR ISC('],
      ['a trailing operator', 'MIT OR'],
      ['a leading operator', 'AND MIT'],
      ['two operators in a row', 'MIT OR AND ISC'],
      ['a dangling operator inside parentheses', '(MIT OR) AND ISC'],
      ['empty parentheses', 'MIT OR ()'],
    ])(
      'reports an expression with %s as one unreadable violation naming the package and the value',
      (_case, licence) => {
        const violations = findLicenseViolations(
          lockfile({
            'node_modules/left-pad': { version: '1.3.0', license: 'MIT' },
            'node_modules/garbled-kit': { version: '6.0.0', license: licence },
          }),
          ALLOWLIST,
        );

        expect(violations).toHaveLength(1);
        const [violation] = violations;
        expect(violation?.subject).toBe('garbled-kit@6.0.0');
        expect(violation?.reason).toContain(`"${licence}"`);
        expect(violation?.reason).toContain('unreadable');
      },
    );
  });

  describe('entries', () => {
    it('checks a nested node_modules entry, naming it after its last node_modules/', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/outer': { version: '1.0.0', license: 'MIT' },
          'node_modules/outer/node_modules/inner': {
            version: '0.9.0',
            license: 'SSPL-1.0',
          },
          'node_modules/@sample/host/node_modules/@sample/guest': {
            version: '5.0.0',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        disallowed('inner@0.9.0', 'SSPL-1.0'),
        unlicensed('@sample/guest@5.0.0'),
      ]);
    });

    it('checks a node_modules entry inside a workspace member folder', () => {
      const violations = findLicenseViolations(
        lockfile({
          'apps/desktop/node_modules/local-dep': {
            version: '2.2.0',
            license: 'AGPL-3.0-only',
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([
        disallowed('local-dep@2.2.0', 'AGPL-3.0-only'),
      ]);
    });

    it('skips the root entry', () => {
      const violations = findLicenseViolations(lockfile({}), ALLOWLIST);

      expect(violations).toEqual([]);
    });

    it('skips workspace member entries and their links', () => {
      const violations = findLicenseViolations(
        lockfile({
          'apps/desktop': { name: '@dashcash/desktop', version: '0.0.0' },
          'packages/domain': {
            name: '@dashcash/domain',
            version: '0.0.0',
            license: 'UNLICENSED',
          },
          'node_modules/@dashcash/desktop': {
            resolved: 'apps/desktop',
            link: true,
          },
          'node_modules/@dashcash/domain': {
            resolved: 'packages/domain',
            link: true,
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([]);
    });

    it('skips a link entry whatever it points to', () => {
      const violations = findLicenseViolations(
        lockfile({
          'node_modules/linked-tool': {
            resolved: 'tools/linked-tool',
            link: true,
          },
        }),
        ALLOWLIST,
      );

      expect(violations).toEqual([]);
    });
  });

  describe('a malformed allowlist', () => {
    const packages = lockfile({
      'node_modules/left-pad': { version: '1.3.0', license: 'MIT' },
      'node_modules/copyleft-kit': {
        version: '4.2.0',
        license: 'GPL-3.0-only',
      },
    });

    it.each([
      ['not an array', { licences: ['MIT'] }],
      ['a string', 'MIT'],
      ['missing', undefined],
      ['empty', []],
      ['holding a non-string entry', ['MIT', 42]],
      ['holding an empty entry', ['MIT', '']],
    ])(
      'is one violation naming the allowlist file when it is %s',
      (_case, allowlist) => {
        const violations = findLicenseViolations(packages, allowlist);

        expect(violations.map(({ subject }) => subject)).toEqual([
          ALLOWLIST_FILE,
        ]);
      },
    );
  });

  describe('a malformed lockfile', () => {
    it.each([
      ['null', null],
      ['an array', [{ packages: {} }]],
      ['a string', 'packages'],
      ['a number', 3],
      [
        'an object without packages',
        { name: 'sample-app', lockfileVersion: 3 },
      ],
      [
        'an object whose packages is null',
        { lockfileVersion: 3, packages: null },
      ],
      [
        'an object whose packages is an array',
        { lockfileVersion: 3, packages: [{ version: '1.0.0' }] },
      ],
      [
        'an object whose packages is a string',
        { lockfileVersion: 3, packages: 'node_modules/left-pad' },
      ],
    ])(
      'is exactly one violation naming the lockfile when it is %s',
      (_case, malformed) => {
        const violations = findLicenseViolations(malformed, ALLOWLIST);

        expect(violations).toEqual([MALFORMED_LOCKFILE]);
      },
    );

    it('reports a malformed allowlist and a malformed lockfile both, the allowlist first', () => {
      const violations = findLicenseViolations({ lockfileVersion: 3 }, 'MIT');

      expect(violations).toEqual([
        {
          subject: ALLOWLIST_FILE,
          reason: 'must be a non-empty array of licence ids',
        },
        MALFORMED_LOCKFILE,
      ]);
    });

    it('reports nothing for a lockfile whose packages is an empty object', () => {
      const violations = findLicenseViolations(
        { lockfileVersion: 3, packages: {} },
        ALLOWLIST,
      );

      expect(violations).toEqual([]);
    });
  });
});

describe('check:licenses', { timeout: 30_000 }, () => {
  let tree: string;

  beforeEach(() => {
    // A folder with the gate scripts, the quality/ folder and a package.json,
    // and no node_modules, so the entry can only read files.
    tree = mkdtempSync(join(tmpdir(), 'dashcash-licenses-'));
    writeFileSync(join(tree, 'package.json'), '{ "type": "module" }\n');
    cpSync(join(ROOT, 'scripts'), join(tree, 'scripts'), { recursive: true });
    cpSync(join(ROOT, 'quality'), join(tree, 'quality'), { recursive: true });
  });

  afterEach(() => {
    rmSync(tree, { recursive: true, force: true });
  });

  // An unreachable proxy and npm's offline mode, so any network access fails.
  const OFFLINE = {
    HTTP_PROXY: 'http://127.0.0.1:9',
    HTTPS_PROXY: 'http://127.0.0.1:9',
    npm_config_offline: 'true',
  };

  it('passes on today’s lockfile without node_modules and without the network', () => {
    cpSync(join(ROOT, 'package-lock.json'), join(tree, 'package-lock.json'));

    const result = runScript('check:licenses', tree, { env: OFFLINE });

    expect(result.status, result.output).toBe(0);
    expect(result.output).toBe('');
  });

  it('reads the lockfile and the allowlist from the folder and names each violation', () => {
    writeTreeFile(
      tree,
      'package-lock.json',
      JSON.stringify(
        lockfile({
          'node_modules/left-pad': { version: '1.3.0', license: 'MIT' },
          'node_modules/copyleft-kit': {
            version: '4.2.0',
            license: 'GPL-3.0-only',
          },
          'node_modules/bare-pkg': { version: '0.1.0' },
        }),
      ),
    );
    writeTreeFile(tree, ALLOWLIST_FILE, JSON.stringify(['MIT']));

    const result = runScript('check:licenses', tree, { env: OFFLINE });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'copyleft-kit@4.2.0: licence "GPL-3.0-only" is not on the licence allowlist',
    );
    expect(result.stderr).toContain('bare-pkg@0.1.0: has no licence');
    expect(result.stderr).not.toContain('left-pad');
  });

  it('fails closed on a lockfile without packages, naming the lockfile', () => {
    writeTreeFile(
      tree,
      'package-lock.json',
      JSON.stringify({ name: 'sample-app', lockfileVersion: 3 }),
    );

    const result = runScript('check:licenses', tree, { env: OFFLINE });

    expect(result.status, result.output).toBe(1);
    expect(result.stderr.trim()).toBe(
      'package-lock.json: must be an object with a packages object',
    );
  });
});
