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
import type { ICruiseResult } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// The renderer's Layer rules: the Layer ladder, the feature module's single
// entry point, and the shared folders beside the ladder. Every case is a
// small tree in a temporary folder, cruised with the real config.

type PackageJson = {
  scripts: Record<string, string | undefined>;
};

type Tree = Record<string, string>;

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CONFIG = join(ROOT, '.dependency-cruiser.js');

const packageJson = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
) as PackageJson;

// The folders lint:deps cruises. A tree passes the ones it has.
const CRUISED_FOLDERS = ['apps', 'packages', 'scripts', 'e2e'];

const TREE_BASE: Tree = {
  'package.json': JSON.stringify({
    name: 'tree',
    private: true,
    type: 'module',
  }),
};

const RENDERER = 'apps/desktop/src/renderer';

type Layer = {
  name: string;
  // A file of the layer that imports.
  file: string;
  // A file of the layer that is imported. For features/ it is the feature
  // module's index.ts, the only file reachable from outside the module.
  entry: string;
};

const TOKENS_LAYER: Layer = {
  name: 'tokens',
  file: `${RENDERER}/tokens/colors/colors.ts`,
  entry: `${RENDERER}/tokens/spacing/spacing.ts`,
};
const PRIMITIVES_LAYER: Layer = {
  name: 'primitives',
  file: `${RENDERER}/primitives/Button/Button.tsx`,
  entry: `${RENDERER}/primitives/Icon/Icon.tsx`,
};
const COMPONENTS_LAYER: Layer = {
  name: 'components',
  file: `${RENDERER}/components/Meter/Meter.tsx`,
  entry: `${RENDERER}/components/Card/Card.tsx`,
};
const FEATURES_LAYER: Layer = {
  name: 'features',
  file: `${RENDERER}/features/import/ImportPanel/ImportPanel.tsx`,
  entry: `${RENDERER}/features/accounts/index.ts`,
};
const LAYOUTS_LAYER: Layer = {
  name: 'layouts',
  file: `${RENDERER}/layouts/MainLayout/MainLayout.tsx`,
  entry: `${RENDERER}/layouts/SideLayout/SideLayout.tsx`,
};
const PAGES_LAYER: Layer = {
  name: 'pages',
  file: `${RENDERER}/pages/ImportPage/ImportPage.tsx`,
  entry: `${RENDERER}/pages/AccountsPage/AccountsPage.tsx`,
};
const APP_LAYER: Layer = {
  name: 'App',
  file: `${RENDERER}/App/App.tsx`,
  entry: `${RENDERER}/App/router/router.ts`,
};

// The Layer ladder, bottom to top.
const LADDER: Layer[] = [
  TOKENS_LAYER,
  PRIMITIVES_LAYER,
  COMPONENTS_LAYER,
  FEATURES_LAYER,
  LAYOUTS_LAYER,
  PAGES_LAYER,
  APP_LAYER,
];

const TOKENS = TOKENS_LAYER.entry;

// Every ladder Layer above tokens/.
const ABOVE_TOKENS = LADDER.slice(1);

// The shared folders beside the ladder, one file each.
const API = `${RENDERER}/api/listAccounts/listAccounts.ts`;
const SHARED: { name: string; file: string }[] = [
  { name: 'api', file: API },
  { name: 'hooks', file: `${RENDERER}/hooks/useAccounts/useAccounts.ts` },
  { name: 'utils', file: `${RENDERER}/utils/formatDate/formatDate.ts` },
  { name: 'types', file: `${RENDERER}/types/account/account.ts` },
  { name: 'assets', file: `${RENDERER}/assets/icons/icons.ts` },
  { name: 'styles', file: `${RENDERER}/styles/globalStyles/globalStyles.ts` },
];

const CONTRACT = 'packages/contract/src/channels/channels.ts';
const DOMAIN = 'packages/domain/src/money/formatCents/formatCents.ts';

const FEATURE_ENTRY = `${RENDERER}/features/accounts/index.ts`;
const FEATURE_INNER = `${RENDERER}/features/accounts/AccountList/AccountList.tsx`;
const FEATURE_INNER_SIBLING = `${RENDERER}/features/accounts/api/listAccountRows/listAccountRows.ts`;
const FEATURE_NESTED_INDEX = `${RENDERER}/features/accounts/AccountList/index.ts`;
const OTHER_FEATURE = FEATURES_LAYER.file;
const PAGE = PAGES_LAYER.file;

// An import of `target` written from `from`, as the code in `from` would
// spell it: a relative path without the file extension.
function importOf(from: string, target: string): string {
  return `import * as imported from '${relativeSpecifier(from, target)}';\n\nexport const value = imported;\n`;
}

function relativeSpecifier(from: string, target: string): string {
  const fromParts = dirname(from).split('/');
  const targetParts = target.replace(/\.tsx?$/, '').split('/');
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

// A tree with `from` importing each of `targets`; every target is written as
// a leaf that imports nothing.
function importTree(from: string, ...targets: string[]): Tree {
  const tree: Tree = {
    [from]: targets.map((target) => importOf(from, target)).join('\n'),
  };
  for (const target of targets) {
    tree[target] = LEAF;
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
  root = mkdtempSync(join(tmpdir(), 'dashcash-layer-rules-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

async function cruiseTree(tree: Tree): Promise<ICruiseResult> {
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
  // A case proves nothing unless its imports resolve to the tree's files.
  const unresolved = output.modules.flatMap((module) =>
    module.dependencies
      .filter((dependency) => dependency.couldNotResolve)
      .map((dependency) => `${module.source} -> ${dependency.module}`),
  );
  expect(unresolved, 'unresolved imports in the tree').toEqual([]);
  return output;
}

async function expectAllowed(tree: Tree): Promise<void> {
  const { summary } = await cruiseTree(tree);

  expect(
    summary.violations.map(
      (violation) =>
        `${violation.rule.name}: ${violation.from} -> ${violation.to}`,
    ),
  ).toEqual([]);
}

// Forbidden means: an error on the import of each target from `from`, which
// fails the gate.
async function expectForbidden(
  tree: Tree,
  from: string,
  ...targets: string[]
): Promise<void> {
  const { summary } = await cruiseTree(tree);
  const flagged = summary.violations
    .filter(
      (violation) =>
        violation.from === from && violation.rule.severity === 'error',
    )
    .map((violation) => violation.to);

  expect(
    targets.filter((target) => !flagged.includes(target)),
    `imports from ${from} without an error`,
  ).toEqual([]);
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

describe('renderer Layer rules', { timeout: 60_000 }, () => {
  describe('the Layer ladder imports only downwards', () => {
    it.each(
      LADDER.slice(1).map((layer, index) => ({
        name: layer.name,
        layer,
        below: LADDER.slice(0, index + 1),
      })),
    )(
      'allows $name to import every layer below it',
      async ({ layer, below }) => {
        await expectAllowed(
          importTree(layer.file, ...below.map((lower) => lower.entry)),
        );
      },
    );

    it.each(LADDER.map((layer) => ({ name: layer.name, layer })))(
      'allows $name to import its own layer',
      async ({ layer }) => {
        await expectAllowed(importTree(layer.file, layer.entry));
      },
    );

    it.each(
      LADDER.slice(0, -1).map((layer, index) => ({
        name: layer.name,
        layer,
        above: LADDER.slice(index + 1),
      })),
    )(
      'forbids $name to import every layer above it',
      async ({ layer, above }) => {
        const targets = above.map((higher) => higher.entry);

        await expectForbidden(
          importTree(layer.file, ...targets),
          layer.file,
          ...targets,
        );
      },
    );
  });

  describe('a feature module is reachable only through its index.ts', () => {
    it('allows another feature module to import its index.ts', async () => {
      await expectAllowed(importTree(OTHER_FEATURE, FEATURE_ENTRY));
    });

    it('allows a page to import its index.ts', async () => {
      await expectAllowed(importTree(PAGE, FEATURE_ENTRY));
    });

    it('allows files inside the feature module to import each other', async () => {
      await expectAllowed({
        ...importTree(FEATURE_ENTRY, FEATURE_INNER),
        ...importTree(FEATURE_INNER, FEATURE_INNER_SIBLING),
      });
    });

    it.each([
      ['another feature module', OTHER_FEATURE],
      ['a page', PAGE],
    ])('forbids %s to import a file inside it', async (_kind, from) => {
      await expectForbidden(
        importTree(from, FEATURE_INNER, FEATURE_INNER_SIBLING),
        from,
        FEATURE_INNER,
        FEATURE_INNER_SIBLING,
      );
    });

    it('forbids another feature module to import an index.ts nested inside it', async () => {
      await expectForbidden(
        importTree(OTHER_FEATURE, FEATURE_NESTED_INDEX),
        OTHER_FEATURE,
        FEATURE_NESTED_INDEX,
      );
    });
  });

  describe('the shared folders sit beside the ladder', () => {
    it.each(LADDER.map((layer) => ({ name: layer.name, layer })))(
      'allows $name to import every shared folder',
      async ({ layer }) => {
        await expectAllowed(
          importTree(layer.file, ...SHARED.map((folder) => folder.file)),
        );
      },
    );

    it.each(SHARED.map((folder) => ({ name: folder.name, folder })))(
      'allows $name to import the other shared folders, tokens/, the contract and the domain',
      async ({ folder }) => {
        const others = SHARED.filter((other) => other !== folder).map(
          (other) => other.file,
        );

        await expectAllowed(
          importTree(folder.file, ...others, TOKENS, CONTRACT, DOMAIN),
        );
      },
    );

    it.each(SHARED.map((folder) => ({ name: folder.name, folder })))(
      'forbids $name to import any ladder layer above tokens/',
      async ({ folder }) => {
        const targets = ABOVE_TOKENS.map((layer) => layer.entry);

        await expectForbidden(
          importTree(folder.file, ...targets),
          folder.file,
          ...targets,
        );
      },
    );
  });

  describe('lint:deps', () => {
    function writeGateTree(tree: Tree): void {
      writeTree(root, {
        'apps/desktop/src/main/ipc/registerHandlers/registerHandlers.ts': LEAF,
        'packages/domain/src/money/addCents/addCents.ts': LEAF,
        'scripts/checkSomething/checkSomething.ts': LEAF,
        'e2e/import-csv.spec.ts': LEAF,
        ...tree,
      });
      copyFileSync(CONFIG, join(root, '.dependency-cruiser.js'));
    }

    it('fails on a tree with an import up the ladder', () => {
      writeGateTree(importTree(PRIMITIVES_LAYER.file, PAGES_LAYER.entry));

      const result = runScript('lint:deps', root);

      expect(result.status, result.output).not.toBe(0);
    });

    it('fails on a tree with an import inside another feature module', () => {
      writeGateTree(importTree(OTHER_FEATURE, FEATURE_INNER));

      const result = runScript('lint:deps', root);

      expect(result.status, result.output).not.toBe(0);
    });

    it('passes on a tree that keeps to the ladder', () => {
      writeGateTree(
        importTree(PAGE, FEATURE_ENTRY, PRIMITIVES_LAYER.entry, API),
      );

      const result = runScript('lint:deps', root);

      expect(result.status, result.output).toBe(0);
    });

    it('passes lint:deps on the repository', () => {
      const result = runScript('lint:deps', ROOT);

      expect(result.status, result.output).toBe(0);
    });
  });
});
