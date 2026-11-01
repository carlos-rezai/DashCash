import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { buildCleanEnv, ROOT } from '../sampleRepository/sampleRepository.ts';

type PackageJson = {
  scripts: Record<string, string | undefined>;
};

export type RunNpmScriptOptions = {
  // Variables added to the clean environment, applied last.
  env?: Record<string, string>;
  // Puts the root node_modules/.bin first on the PATH, as `npm run` does.
  rootBin?: boolean;
};

export type NpmScriptResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  output: string;
};

const packageJson = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
) as PackageJson;

// Puts the root node_modules/.bin first on the PATH, whatever the case of the
// variable's name (Windows spells it Path).
function prependRootBin(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const pathKey =
    Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
  return {
    ...env,
    [pathKey]: [join(ROOT, 'node_modules', '.bin'), env[pathKey]]
      .filter((part) => part !== undefined)
      .join(delimiter),
  };
}

// Runs the command of a root package.json script through the shell in the
// folder, with the clean environment of the sample repositories; an unknown
// script throws.
export function runNpmScript(
  name: string,
  cwd: string,
  options: RunNpmScriptOptions = {},
): NpmScriptResult {
  const script = packageJson.scripts[name];
  if (script === undefined) {
    throw new Error(`npm script ${name} is missing`);
  }
  const env = buildCleanEnv(options.env);
  const result = spawnSync(script, {
    cwd,
    shell: true,
    encoding: 'utf8',
    env: options.rootBin === true ? prependRootBin(env) : env,
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: result.stdout + result.stderr,
  };
}
