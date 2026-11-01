import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise } from 'dependency-cruiser';
import type { IViolation } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type PackageJson = {
  scripts: Record<string, string | undefined>;
};

type Tree = Record<string, string>;

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const CONFIG = join(ROOT, '.dependency-cruiser.js');

const packageJson = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
) as PackageJson;

// The folders lint:deps cruises. A tree passes the ones it has.
const CRUISED_FOLDERS = ['apps', 'packages', 'scripts', 'e2e'];

// Every tree is a small copy of the repository's folders, cruised from its
// own root, so the real rules match it. Invented npm packages live in the
// tree's own node_modules and are declared in its package.json, so they
// resolve as real npm dependencies.
const NPM_PACKAGES = ['electron', 'left-pad'];

const TREE_BASE: Tree = {
  'package.json': JSON.stringify({
    name: 'tree',
    private: true,
    type: 'module',
    dependencies: Object.fromEntries(
      NPM_PACKAGES.map((name) => [name, '1.0.0']),
    ),
  }),
  ...Object.fromEntries(
    NPM_PACKAGES.flatMap((name) => [
      [
        `node_modules/${name}/package.json`,
        JSON.stringify({ name, version: '1.0.0', main: 'index.js' }),
      ],
      [`node_modules/${name}/index.js`, 'export const value = 1;\n'],
    ]),
  ),
};

const DOMAIN = 'packages/domain/src/money/addCents/addCents.ts';
const DOMAIN_SIBLING = 'packages/domain/src/money/formatCents/formatCents.ts';
const CONTRACT = 'packages/contract/src/channels/channels.ts';
const MAIN = 'apps/desktop/src/main/ipc/registerHandlers/registerHandlers.ts';
const PRELOAD = 'apps/desktop/src/preload/exposeContract/exposeContract.ts';
const RENDERER = 'apps/desktop/src/renderer/api/listAccounts/listAccounts.ts';
const RENDERER_TEST_SUPPORT =
  'apps/desktop/src/renderer/test-support/fakeBridge/fakeBridge.ts';

// An import of `target` written from `from`, as the code in `from` would
// spell it: a relative path for a repository file, the bare name otherwise.
function importOf(from: string, target: string): string {
  const specifier = target.includes('/')
    ? relativeSpecifier(from, target)
    : target;
  return `import * as imported from '${specifier}';\n\nexport const value = imported;\n`;
}

function relativeSpecifier(from: string, target: string): string {
  const fromParts = dirname(from).split('/');
  const targetParts = target.split('/');
  let shared = 0;
  while (
    shared < fromParts.length &&
    shared < targetParts.length - 1 &&
    fromParts[shared] === targetParts[shared]
  ) {
    shared += 1;
  }
  const up = fromParts.slice(shared).map(() => '..');
  const relative = [...up, ...targetParts.slice(shared)].join('/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

const LEAF = 'export const value = 1;\n';

// A tree with `from` importing each of `targets`; every repository file a
// target names is written as a leaf that imports nothing.
function importTree(from: string, ...targets: string[]): Tree {
  const tree: Tree = {
    [from]: targets.map((target) => importOf(from, target)).join('\n'),
  };
  for (const target of targets) {
    if (target.includes('/')) {
      tree[target] = LEAF;
    }
  }
  return tree;
}

function writeTree(root: string, tree: Tree): void {
  for (const [file, content] of Object.entries({ ...TREE_BASE, ...tree })) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dashcash-depcruise-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

async function violationsOf(tree: Tree): Promise<IViolation[]> {
  writeTree(root, tree);
  const folders = CRUISED_FOLDERS.filter((folder) =>
    Object.keys(tree).some((file) => file.startsWith(`${folder}/`)),
  );
  const options = await extractDepcruiseOptions(CONFIG);
  const { output } = await cruise(folders, {
    ...options,
    baseDir: root,
    validate: true,
  });
  if (typeof output === 'string') {
    throw new Error(`expected a cruise result, got: ${output}`);
  }
  return output.summary.violations;
}

async function expectAllowed(tree: Tree): Promise<void> {
  expect(await violationsOf(tree)).toEqual([]);
}

// Forbidden means: an error on the importing file, which fails the gate.
async function expectForbidden(tree: Tree, from: string): Promise<void> {
  const violations = await violationsOf(tree);

  expect(
    violations
      .filter((violation) => violation.from === from)
      .map((violation) => violation.rule.severity),
  ).toContain('error');
}

// Runs an npm script's command the way `npm run` does: through the shell,
// with the root node_modules/.bin on the PATH.
function runScript(
  name: string,
  cwd: string,
): { status: number | null; output: string } {
  const script = packageJson.scripts[name];
  if (script === undefined) {
    throw new Error(`npm script ${name} is missing`);
  }
  const pathKey =
    Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ??
    'PATH';
  const result = spawnSync(script, {
    cwd,
    shell: true,
    encoding: 'utf8',
    env: {
      ...process.env,
      [pathKey]: [join(ROOT, 'node_modules', '.bin'), process.env[pathKey]]
        .filter((part) => part !== undefined)
        .join(delimiter),
    },
  });
  return { status: result.status, output: result.stdout + result.stderr };
}

describe('dependency-cruiser config', { timeout: 60_000 }, () => {
  describe('packages/domain imports nothing outside itself', () => {
    it('allows a domain import of another domain module', async () => {
      await expectAllowed(importTree(DOMAIN, DOMAIN_SIBLING));
    });

    it('forbids a domain import of another workspace', async () => {
      await expectForbidden(importTree(DOMAIN, CONTRACT), DOMAIN);
    });

    it('forbids a domain import of an npm package', async () => {
      await expectForbidden(importTree(DOMAIN, 'left-pad'), DOMAIN);
    });

    it('forbids a domain import of a Node built-in', async () => {
      await expectForbidden(importTree(DOMAIN, 'node:fs'), DOMAIN);
    });
  });

  describe('packages/contract imports only packages/domain', () => {
    it('allows a contract import of the domain', async () => {
      await expectAllowed(importTree(CONTRACT, DOMAIN));
    });

    it('forbids a contract import of the main process', async () => {
      await expectForbidden(importTree(CONTRACT, MAIN), CONTRACT);
    });

    it('forbids a contract import of an npm package', async () => {
      await expectForbidden(importTree(CONTRACT, 'left-pad'), CONTRACT);
    });

    it('forbids a contract import of a Node built-in', async () => {
      await expectForbidden(importTree(CONTRACT, 'node:fs'), CONTRACT);
    });
  });

  describe('the renderer stays out of Node, Electron, main and preload', () => {
    it('allows a renderer import of the contract and an npm package', async () => {
      await expectAllowed(importTree(RENDERER, CONTRACT, 'left-pad'));
    });

    it('allows a renderer import of packages/domain', async () => {
      await expectAllowed(importTree(RENDERER, DOMAIN));
    });

    it('forbids a renderer import of a Node built-in', async () => {
      await expectForbidden(importTree(RENDERER, 'node:fs'), RENDERER);
    });

    it('forbids a renderer import of electron', async () => {
      await expectForbidden(importTree(RENDERER, 'electron'), RENDERER);
    });

    it('forbids a renderer import of main/', async () => {
      await expectForbidden(importTree(RENDERER, MAIN), RENDERER);
    });

    it('forbids a renderer import of preload/', async () => {
      await expectForbidden(importTree(RENDERER, PRELOAD), RENDERER);
    });
  });

  describe('the preload imports only electron and the contract', () => {
    it('allows a preload import of electron and the contract', async () => {
      await expectAllowed(importTree(PRELOAD, 'electron', CONTRACT));
    });

    it('forbids a preload import of main/', async () => {
      await expectForbidden(importTree(PRELOAD, MAIN), PRELOAD);
    });

    it('forbids a preload import of a Node built-in', async () => {
      await expectForbidden(importTree(PRELOAD, 'node:fs'), PRELOAD);
    });

    it('forbids a preload import of another npm package', async () => {
      await expectForbidden(importTree(PRELOAD, 'left-pad'), PRELOAD);
    });
  });

  describe('test-support/ is imported only by tests', () => {
    it.each([
      ['a test', 'apps/desktop/src/renderer/components/Meter/Meter.test.tsx'],
      [
        'a story',
        'apps/desktop/src/renderer/components/Meter/Meter.stories.tsx',
      ],
      [
        'a test-support/ file',
        'apps/desktop/src/renderer/test-support/renderWithBridge/renderWithBridge.ts',
      ],
      ['an e2e/ file', 'e2e/import-csv.spec.ts'],
    ])('allows %s to import test-support/', async (_kind, from) => {
      await expectAllowed(importTree(from, RENDERER_TEST_SUPPORT));
    });

    it('allows a domain test to import the domain test-support/', async () => {
      await expectAllowed(
        importTree(
          'packages/domain/src/money/addCents/addCents.test.ts',
          'packages/domain/src/test-support/seedCents/seedCents.ts',
        ),
      );
    });

    it('forbids a Shipping code file in the renderer to import test-support/', async () => {
      const from = 'apps/desktop/src/renderer/components/Meter/Meter.tsx';

      await expectForbidden(importTree(from, RENDERER_TEST_SUPPORT), from);
    });

    it('forbids a Shipping code file in the domain to import test-support/', async () => {
      await expectForbidden(
        importTree(
          DOMAIN,
          'packages/domain/src/test-support/seedCents/seedCents.ts',
        ),
        DOMAIN,
      );
    });
  });

  describe('lint:deps', () => {
    function writeGateTree(tree: Tree): void {
      writeTree(root, {
        'apps/desktop/src/main/ipc/registerHandlers/registerHandlers.ts': LEAF,
        'scripts/checkSomething/checkSomething.ts': LEAF,
        'e2e/import-csv.spec.ts': LEAF,
        ...tree,
      });
      copyFileSync(CONFIG, join(root, '.dependency-cruiser.js'));
    }

    it('fails on a tree with a forbidden import', () => {
      writeGateTree(importTree(DOMAIN, 'node:fs'));

      const result = runScript('lint:deps', root);

      expect(result.status, result.output).not.toBe(0);
    });

    it('passes on a tree without forbidden imports', () => {
      writeGateTree(importTree(DOMAIN, DOMAIN_SIBLING));

      const result = runScript('lint:deps', root);

      expect(result.status, result.output).toBe(0);
    });

    it('passes lint:deps on the repository', () => {
      const result = runScript('lint:deps', ROOT);

      expect(result.status, result.output).toBe(0);
    });
  });
});
