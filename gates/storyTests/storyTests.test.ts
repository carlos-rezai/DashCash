import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

// The Story tests and their Accessibility check (design log Q29, A5, D1).
// The a11y parameters live in .storybook/a11y.ts, a module that imports
// nothing, so this test can load it in Node; the preview passes them to every
// Story. They hold `test: 'error'` and no rule changes: any axe violation,
// colour contrast included, fails its Story test and so Verify. A rule
// change, `color-contrast` with `reviewOnFail` included, fails this test.
//
// vitest.storybook.config.ts runs the Storybook plugin on .storybook/ in
// browser mode, with the Playwright provider, headless, in exactly one
// Chromium instance. Any of these settings changed fails this test.

type PackageJson = { devDependencies?: Record<string, string> };

type StoryConfigs = {
  browser: {
    enabled?: unknown;
    headless?: unknown;
    provider?: unknown;
    instances?: unknown;
  } | null;
  addons: unknown;
};

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const A11Y_MODULE = '.storybook/a11y.ts';
const PREVIEW = '.storybook/preview.tsx';
const STORY_TEST_CONFIG = 'vitest.storybook.config.ts';
const STORYBOOK_PLUGIN_MODULE = '@storybook/addon-vitest/vitest-plugin';
const A11Y_ADDON = '@storybook/addon-a11y';

// Imports the story-test config and Storybook's main config in a fresh Node
// process without Vitest's environment, so the Storybook plugin loads no
// Storybook, and prints the browser settings (the provider by its name) and
// the addons.
const READ_CONFIGS = `const { default: storyTests } = await import('./${STORY_TEST_CONFIG}');
const { default: storybook } = await import('./.storybook/main.ts');
const browser = storyTests.test?.browser;
console.log(JSON.stringify({
  browser: browser
    ? {
        enabled: browser.enabled,
        headless: browser.headless,
        provider: browser.provider?.name ?? null,
        instances: browser.instances,
      }
    : null,
  addons: storybook.addons ?? null,
}));`;

function readRootFile(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

async function loadA11y(): Promise<unknown> {
  const { a11y } = (await import('../../.storybook/a11y.ts')) as {
    a11y: unknown;
  };
  return a11y;
}

function importedModules(path: string): string[] {
  return ts
    .preProcessFile(readRootFile(path), true, true)
    .importedFiles.map(({ fileName }) => fileName);
}

let storyConfigs: StoryConfigs | undefined;

// Read once: the configs are committed files no test changes.
function readStoryConfigs(): StoryConfigs {
  if (storyConfigs === undefined) {
    const env = { ...process.env };
    delete env.VITEST;
    const { status, stdout, stderr } = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', READ_CONFIGS],
      { cwd: ROOT, encoding: 'utf8', env },
    );
    if (status !== 0) {
      throw new Error(`reading the Storybook configs failed: ${stderr}`);
    }
    storyConfigs = JSON.parse(stdout) as StoryConfigs;
  }
  return storyConfigs;
}

// The `plugins` array of the object the story-test config passes to
// defineConfig, as its source nodes.
function readPluginsNode(source: ts.SourceFile): ts.ArrayLiteralExpression {
  let plugins: ts.ArrayLiteralExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'plugins' &&
      ts.isArrayLiteralExpression(node.initializer)
    ) {
      plugins = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (plugins === undefined) {
    throw new Error(`${STORY_TEST_CONFIG}: no plugins array`);
  }
  return plugins;
}

// An option of a plugin call as its name and value, a string value read as
// its text, any other value as its source.
function describeOption(
  property: ts.ObjectLiteralElementLike,
  source: ts.SourceFile,
): [string, string] {
  const value =
    ts.isPropertyAssignment(property) &&
    ts.isStringLiteral(property.initializer)
      ? property.initializer.text
      : property.getText(source);
  return [property.name?.getText(source) ?? '', value];
}

// Every plugin entry as the name of the function it calls and its options.
function describePlugins(source: ts.SourceFile): unknown[] {
  return readPluginsNode(source).elements.map((element) => {
    if (!ts.isCallExpression(element)) {
      return element.getText(source);
    }
    return {
      calls: element.expression.getText(source),
      options: element.arguments.map((argument) =>
        ts.isObjectLiteralExpression(argument)
          ? Object.fromEntries(
              argument.properties.map((property) =>
                describeOption(property, source),
              ),
            )
          : argument.getText(source),
      ),
    };
  });
}

// The local names bound to `storybookTest` by the imports of the plugin
// module, unaliased.
function importedStorybookTest(source: ts.SourceFile): string[] {
  return source.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== STORYBOOK_PLUGIN_MODULE
    ) {
      return [];
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) {
      return [];
    }
    return bindings.elements
      .filter(
        (element) =>
          (element.propertyName?.text ?? element.name.text) === 'storybookTest',
      )
      .map((element) => element.name.text);
  });
}

describe('the Accessibility check', { timeout: 60_000 }, () => {
  it('fails the Story test on any axe violation', async () => {
    const a11y = await loadA11y();

    expect(a11y).toHaveProperty('test', 'error');
  });

  it('changes no axe rule, colour contrast included', async () => {
    const a11y = await loadA11y();

    expect(a11y).toStrictEqual({ test: 'error' });
  });

  it('keeps its parameters in a module that imports nothing', async () => {
    await loadA11y();

    expect(importedModules(A11Y_MODULE)).toEqual([]);
  });

  it('is applied to every Story by the preview', async () => {
    await loadA11y();

    expect(importedModules(PREVIEW)).toContain('./a11y.ts');
  });

  it('runs through the a11y addon that Storybook loads', () => {
    expect(readStoryConfigs().addons).toContain(A11Y_ADDON);
  });

  it('pins the a11y addon exactly, on the version of the other Storybook packages', () => {
    const { devDependencies = {} } = JSON.parse(
      readRootFile('package.json'),
    ) as PackageJson;

    expect(devDependencies[A11Y_ADDON]).toEqual(
      expect.stringMatching(/^\d+\.\d+\.\d+$/),
    );
    expect(devDependencies[A11Y_ADDON]).toBe(devDependencies.storybook);
  });
});

describe('the story-test config', { timeout: 60_000 }, () => {
  const source = ts.createSourceFile(
    STORY_TEST_CONFIG,
    readRootFile(STORY_TEST_CONFIG),
    ts.ScriptTarget.Latest,
    true,
  );

  it('runs exactly the Storybook plugin, on .storybook/', () => {
    expect(importedStorybookTest(source)).toEqual(['storybookTest']);
    expect(describePlugins(source)).toStrictEqual([
      { calls: 'storybookTest', options: [{ configDir: '.storybook' }] },
    ]);
  });

  it('runs in browser mode', () => {
    expect(readStoryConfigs().browser?.enabled).toBe(true);
  });

  it('runs the browser headless', () => {
    expect(readStoryConfigs().browser?.headless).toBe(true);
  });

  it('drives the browser with the Playwright provider', () => {
    expect(readStoryConfigs().browser?.provider).toBe('playwright');
  });

  it('runs exactly one Chromium instance', () => {
    expect(readStoryConfigs().browser?.instances).toStrictEqual([
      { browser: 'chromium' },
    ]);
  });
});
