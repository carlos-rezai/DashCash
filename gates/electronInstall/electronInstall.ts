import type { Workflow } from '../../scripts/readWorkflow/readWorkflow.ts';

// npm ci installs the Electron binary through the root postinstall script, so
// no workflow step installs it and nothing in .npmrc may skip the script.
const INSTALL_ELECTRON = 'install-electron';
const IGNORE_SCRIPTS_LINE = /^[ \t]*ignore-scripts[ \t]*=[ \t]*true[ \t]*\r?$/m;

// What stands between npm ci and the Electron binary, one line each: a
// postinstall script that is missing or not exactly install-electron, every
// workflow step that runs install-electron, named by file and job, and an
// ignore-scripts=true line in .npmrc.
export function findElectronInstallProblems(
  scripts: Record<string, string>,
  workflows: Record<string, Workflow>,
  npmrc: string,
): string[] {
  const problems: string[] = [];

  const postinstall = scripts['postinstall'];
  if (postinstall === undefined) {
    problems.push(
      `the postinstall script is missing; it must be exactly ${INSTALL_ELECTRON}`,
    );
  } else if (postinstall !== INSTALL_ELECTRON) {
    problems.push(
      `the postinstall script is ${JSON.stringify(postinstall)}; it must be exactly ${INSTALL_ELECTRON}`,
    );
  }

  for (const [file, workflow] of Object.entries(workflows)) {
    for (const [job, { steps = [] } = {}] of Object.entries(
      workflow.jobs ?? {},
    )) {
      for (const step of steps) {
        if ((step.run ?? '').includes(INSTALL_ELECTRON)) {
          problems.push(
            `${file}: the ${job} job runs ${INSTALL_ELECTRON} in a step`,
          );
        }
      }
    }
  }

  if (IGNORE_SCRIPTS_LINE.test(npmrc)) {
    problems.push(
      '.npmrc sets ignore-scripts=true, so npm ci skips postinstall',
    );
  }
  return problems;
}
