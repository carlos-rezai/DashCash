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
//
// .storybook/main.ts loads exactly the Vitest, a11y and MCP addons, the last
// serving the Storybook MCP, and keeps telemetry off (design log I6). An
// addon added or removed, or telemetry on, fails this test.

type PackageJson = { devDependencies?: Record<string, string> };

type StoryConfigs = {
  browser: {
    enabled?: unknown;
    headless?: unknown;
    provider?: unknown;
    instances?: unknown;
  } | null;
  addons: unknown;
  disableTelemetry: unknown;
};

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const A11Y_MODULE = '.storybook/a11y.ts';
const PREVIEW = '.storybook/preview.tsx';
const STORY_TEST_CONFIG = 'vitest.storybook.config.ts';
const STORYBOOK_PLUGIN_MODULE = '@storybook/addon-vitest/vitest-plugin';
const A11Y_ADDON = '@storybook/addon-a11y';
const STORYBOOK_ADDONS = [
  '@storybook/addon-vitest',
  A11Y_ADDON,
  '@storybook/addon-mcp',
];

// Imports the story-test config and Storybook's main config in a fresh Node
// process without Vitest's environment, so the Storybook plugin loads no
// Storybook, and prints the browser settings (the provider by its name) and
// the addons and the telemetry setting.
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
  disableTelemetry: storybook.core?.disableTelemetry ?? null,
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

type Binding = { module: string; imported: string; local: string };

// Every name an import declaration binds, as its module, the name it takes
// from that module (`default` and `*` for the other forms) and its local name.
function readBindings(source: ts.SourceFile): Binding[] {
  return source.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return [];
    }
    const module = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (clause === undefined) {
      return [];
    }
    const bindings: Binding[] = [];
    if (clause.name !== undefined) {
      bindings.push({ module, imported: 'default', local: clause.name.text });
    }
    const named = clause.namedBindings;
    if (named !== undefined && ts.isNamespaceImport(named)) {
      bindings.push({ module, imported: '*', local: named.name.text });
    }
    if (named !== undefined && ts.isNamedImports(named)) {
      for (const element of named.elements) {
        bindings.push({
          module,
          imported: (element.propertyName ?? element.name).text,
          local: element.name.text,
        });
      }
    }
    return bindings;
  });
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

// The object the preview exports as its default, whether it is written in
// place or in a variable that is exported by name.
function readPreviewConfig(source: ts.SourceFile): ts.ObjectLiteralExpression {
  const exported = source.statements.find(
    (statement): statement is ts.ExportAssignment =>
      ts.isExportAssignment(statement) && statement.isExportEquals !== true,
  );
  if (exported === undefined) {
    throw new Error(`${PREVIEW}: no default export`);
  }
  let value = unwrapExpression(exported.expression);
  if (ts.isIdentifier(value)) {
    const name = value.text;
    const declaration = source.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) => [...statement.declarationList.declarations])
      .find(
        (candidate) =>
          ts.isIdentifier(candidate.name) && candidate.name.text === name,
      );
    if (declaration?.initializer === undefined) {
      throw new Error(`${PREVIEW}: no value for the default export ${name}`);
    }
    value = unwrapExpression(declaration.initializer);
  }
  if (!ts.isObjectLiteralExpression(value)) {
    throw new Error(`${PREVIEW}: the default export is not an object`);
  }
  return value;
}

// The entries of the preview's `parameters` object as their source, `a11y`
// for both `a11y` and `a11y: a11y`; a spread or any other entry as written.
function describePreviewParameters(source: ts.SourceFile): string[] {
  const properties = readPreviewConfig(source).properties.filter(
    (property) => property.name?.getText(source) === 'parameters',
  );
  const parameters = properties.length === 1 ? properties[0] : undefined;
  if (
    parameters === undefined ||
    !ts.isPropertyAssignment(parameters) ||
    !ts.isObjectLiteralExpression(parameters.initializer)
  ) {
    return properties.map((property) => property.getText(source));
  }
  return parameters.initializer.properties.map((property) => {
    if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      ts.isIdentifier(property.initializer) &&
      property.name.text === property.initializer.text
    ) {
      return property.name.text;
    }
    return property.getText(source);
  });
}

// Names the preview declares itself, which could shadow the imported `a11y`.
function declaredNames(source: ts.SourceFile): string[] {
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isVariableDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isParameter(node)) &&
      node.name !== undefined &&
      ts.isIdentifier(node.name)
    ) {
      names.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return names;
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

  describe('the preview', () => {
    const source = ts.createSourceFile(
      PREVIEW,
      readRootFile(PREVIEW),
      ts.ScriptTarget.Latest,
      true,
    );

    it('passes exactly the a11y parameters to every Story, unchanged', () => {
      expect(describePreviewParameters(source)).toStrictEqual(['a11y']);
      expect(
        readPreviewConfig(source).properties.some(ts.isSpreadAssignment),
      ).toBe(false);
    });

    it('takes a11y from .storybook/a11y.ts and from no other source', () => {
      expect(
        readBindings(source).filter(({ local }) => local === 'a11y'),
      ).toStrictEqual([
        { module: './a11y.ts', imported: 'a11y', local: 'a11y' },
      ]);
      expect(declaredNames(source)).not.toContain('a11y');
    });
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

describe('the Storybook config', { timeout: 60_000 }, () => {
  it('loads exactly the Vitest, a11y and MCP addons, with telemetry off', () => {
    const { addons, disableTelemetry } = readStoryConfigs();

    expect({ addons, disableTelemetry }).toStrictEqual({
      addons: STORYBOOK_ADDONS,
      disableTelemetry: true,
    });
  });
});
