import {
  checkPullRequest,
  RENOVATE_FEATURE,
} from '../../scripts/checkPullRequest/checkPullRequest.ts';
import { isRecord } from '../../scripts/isRecord/isRecord.ts';
import {
  lintCommitMessages,
  type loadCommitConfig,
} from '../../scripts/lintCommitMessages/lintCommitMessages.ts';
import { parseCommitHeader } from '../../scripts/parseCommitHeader/parseCommitHeader.ts';
import type { Violation } from '../../scripts/reportViolations/reportViolations.ts';

type CommitConfig = Awaited<ReturnType<typeof loadCommitConfig>>;
type Settings = Record<string, unknown>;

const PRESETS = [
  ':disableDependencyDashboard',
  'config:recommended',
  'helpers:pinGitHubActionDigests',
];
const SEMANTIC_COMMITS = 'disabled';
const MINIMUM_RELEASE_AGE = '14 days';
const SCHEDULE = ['before 6am on monday'];
const TIMEZONE = 'Europe/Berlin';
const BRANCH_PREFIX = 'renovate/';
const RENOVATE_BRANCH = 'renovate/sample';
const SUBJECT = 'renovate.json';
const NODE_DEP = 'node';
const NODE_MANAGERS = ['nvm', 'npm'];
const NPM_MANAGER = 'npm';
const LOCKFILE_UPDATE_TYPE = 'lockFileMaintenance';
const NODE_RULE_KEYS = ['matchManagers', 'matchDepNames'];

function hasSameItems(value: unknown, expected: readonly string[]): boolean {
  if (!Array.isArray(value)) return false;
  const items = value.map((item: unknown) => String(item)).sort();
  return (
    items.length === expected.length &&
    items.join(',') === [...expected].sort().join(',')
  );
}

// Every object in the config, the root first, at any depth.
function collectObjects(value: unknown): Settings[] {
  if (Array.isArray(value)) return value.flatMap(collectObjects);
  if (!isRecord(value)) return [];
  return [value, ...Object.values(value).flatMap(collectObjects)];
}

function describeValue(value: unknown): string {
  return value === undefined ? 'missing' : JSON.stringify(value);
}

function findSettingViolations(config: Settings): Violation[] {
  const violations: Violation[] = [];
  const fail = (reason: string) =>
    violations.push({ subject: SUBJECT, reason });
  if (!hasSameItems(config['extends'], PRESETS)) {
    fail(`extends must be exactly ${PRESETS.join(', ')}`);
  }
  if (config['semanticCommits'] !== SEMANTIC_COMMITS) {
    fail(`semanticCommits must be "${SEMANTIC_COMMITS}"`);
  }
  if (config['minimumReleaseAge'] !== MINIMUM_RELEASE_AGE) {
    fail(`minimumReleaseAge must be "${MINIMUM_RELEASE_AGE}"`);
  }
  if (!hasSameItems(config['schedule'], SCHEDULE)) {
    fail(`schedule must be ${describeValue(SCHEDULE)}`);
  }
  if (config['timezone'] !== TIMEZONE) {
    fail(`timezone must be "${TIMEZONE}"`);
  }
  if (
    config['branchPrefix'] !== undefined &&
    config['branchPrefix'] !== BRANCH_PREFIX
  ) {
    fail(`branchPrefix must be the default "${BRANCH_PREFIX}"`);
  }
  for (const object of collectObjects(config)) {
    if ('commitBody' in object) fail('no commitBody is allowed');
    if (object['automerge'] !== undefined && object['automerge'] !== false) {
      fail('no automerge is allowed');
    }
  }
  return violations;
}

function listIncludes(value: unknown, item: string): boolean {
  return Array.isArray(value) && value.includes(item);
}

// The Node rule covers the dependency node in both the nvm manager (.nvmrc)
// and the npm manager's engines (engines.node): both managers, not disabled,
// and no other match* or exclude* key that could leave one of them out.
function isNodeRule(rule: Settings): boolean {
  const narrowed = Object.keys(rule).some(
    (key) => /^(match|exclude)/.test(key) && !NODE_RULE_KEYS.includes(key),
  );
  return (
    listIncludes(rule['matchDepNames'], NODE_DEP) &&
    NODE_MANAGERS.every((manager) =>
      listIncludes(rule['matchManagers'], manager),
    ) &&
    !narrowed &&
    rule['enabled'] !== false
  );
}

// A rule without matchManagers applies to every manager, npm included.
function matchesNpm(rule: Settings): boolean {
  return (
    rule['matchManagers'] === undefined ||
    listIncludes(rule['matchManagers'], NPM_MANAGER)
  );
}

// Lockfile maintenance has no dependency name, so a rule narrowed by
// matchDepNames (the Node rule) never applies to it; any other npm rule does,
// unless matchUpdateTypes leaves lockFileMaintenance out.
function reachesLockfileMaintenance(rule: Settings): boolean {
  if (!matchesNpm(rule)) return false;
  const names = rule['matchDepNames'];
  if (Array.isArray(names) && names.length > 0) return false;
  const types = rule['matchUpdateTypes'];
  return !Array.isArray(types) || types.includes(LOCKFILE_UPDATE_TYPE);
}

function findGroupViolations(config: Settings): Violation[] {
  const violations: Violation[] = [];
  const fail = (reason: string) =>
    violations.push({ subject: SUBJECT, reason });
  const rules = Array.isArray(config['packageRules'])
    ? config['packageRules'].filter(isRecord)
    : [];
  if (!rules.some(isNodeRule)) {
    fail(
      'a packageRule must cover the dependency node in both the nvm manager and the npm manager (engines.node)',
    );
  }
  // Later rules win in Renovate: the Node rule comes after every other rule
  // for the npm manager.
  const lastNode = rules.findLastIndex(isNodeRule);
  if (lastNode !== -1 && rules.slice(lastNode + 1).some(matchesNpm)) {
    fail('the Node rule must come after every other packageRule for npm');
  }
  if (rules.some(reachesLockfileMaintenance)) {
    fail(
      `a packageRule for npm must set matchUpdateTypes without ${LOCKFILE_UPDATE_TYPE}`,
    );
  }
  const lockfile = config['lockFileMaintenance'];
  if (!isRecord(lockfile) || lockfile['enabled'] !== true) {
    fail('lockFileMaintenance must be enabled');
  }
  const alerts = config['vulnerabilityAlerts'];
  if (!isRecord(alerts)) {
    fail('vulnerabilityAlerts must be set');
  } else {
    if (alerts['commitMessageSuffix'] !== '') {
      fail('vulnerabilityAlerts must set commitMessageSuffix to ""');
    }
    for (const text of [alerts['commitMessage'], alerts['prTitle']]) {
      if (typeof text === 'string' && /\[security\]/i.test(text)) {
        fail('a vulnerability-alert title carries no [SECURITY] suffix');
      }
    }
  }
  return violations;
}

async function findMessageViolations(
  message: unknown,
  commitConfig: CommitConfig,
): Promise<Violation[]> {
  if (typeof message !== 'string') {
    return [{ subject: describeValue(message), reason: 'must be a string' }];
  }
  const violations: Violation[] = [];
  const fail = (reason: string) =>
    violations.push({ subject: message, reason });
  if (message.includes('{{')) fail('a commit message holds no template');
  if (parseCommitHeader(message)?.feature !== RENOVATE_FEATURE) {
    fail(`a commit message names the feature ${RENOVATE_FEATURE}`);
  }
  violations.push(...(await lintCommitMessages([message], commitConfig)));
  return violations;
}

async function findTitleViolations(
  title: unknown,
  commitConfig: CommitConfig,
): Promise<Violation[]> {
  if (typeof title !== 'string') {
    return [{ subject: describeValue(title), reason: 'must be a string' }];
  }
  const violations: Violation[] = [];
  if (title.includes('{{')) {
    violations.push({ subject: title, reason: 'a PR title holds no template' });
  }
  violations.push(
    ...(await checkPullRequest({
      branch: RENOVATE_BRANCH,
      title,
      trackedPaths: [],
      readFile: () => '',
      lintTitle: (header) => lintCommitMessages([header], commitConfig),
    })),
  );
  return violations;
}

// The Renovate rule: every commit message and PR title in the config, at any
// depth, is fixed text that passes the commitlint config and the Pull-request
// check, each title equals its commit message, and the base settings hold.
export async function findRenovateViolations(
  config: unknown,
  commitConfig: CommitConfig,
): Promise<Violation[]> {
  if (!isRecord(config)) {
    return [{ subject: SUBJECT, reason: 'the config must be an object' }];
  }
  const violations = [
    ...findSettingViolations(config),
    ...findGroupViolations(config),
  ];
  for (const object of collectObjects(config)) {
    const { commitMessage, prTitle } = object;
    if (commitMessage !== undefined) {
      violations.push(
        ...(await findMessageViolations(commitMessage, commitConfig)),
      );
    }
    if (prTitle !== undefined) {
      violations.push(...(await findTitleViolations(prTitle, commitConfig)));
    }
    if (commitMessage !== prTitle && (commitMessage ?? prTitle) !== undefined) {
      violations.push({
        subject: describeValue(commitMessage ?? prTitle),
        reason: 'a PR title is the same text as its commit message',
      });
    }
  }
  return violations;
}
