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
const SCHEDULE = ['on monday'];
const TYPES_NODE_DEP = '@types/node';
const TYPESCRIPT_DEP = 'typescript';
const MAJOR_UPDATE_TYPE = 'major';
const TIMEZONE = 'Europe/Berlin';
const BRANCH_PREFIX = 'renovate/';
const RENOVATE_BRANCH = 'renovate/sample';
const SUBJECT = 'renovate.json';
const NODE_DEP = 'node';
const NODE_MANAGERS = ['nvm', 'npm'];
const NPM_MANAGER = 'npm';
const LOCKFILE_UPDATE_TYPE = 'lockFileMaintenance';
const NODE_RULE_KEYS = ['matchManagers', 'matchDepNames'];
const COMMIT_MESSAGE_PARTS = [
  'commitMessagePrefix',
  'commitMessageAction',
  'commitMessageTopic',
  'commitMessageExtra',
  'commitMessageSuffix',
];

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
  const lockfile = config['lockFileMaintenance'];
  if (isRecord(lockfile) && !hasSameItems(lockfile['schedule'], SCHEDULE)) {
    fail(`lockFileMaintenance schedule must be ${describeValue(SCHEDULE)}`);
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

function hasExactKeys(rule: Settings, keys: readonly string[]): boolean {
  return hasSameItems(Object.keys(rule), keys);
}

// The three Hold rules, each recognised by exactly its keys: the cap on
// @types/node (its value is checked against .nvmrc apart), TypeScript majors
// disabled and Node majors disabled in both managers.
function isCapRule(rule: Settings): boolean {
  return (
    hasExactKeys(rule, ['matchManagers', 'matchDepNames', 'allowedVersions']) &&
    hasSameItems(rule['matchManagers'], [NPM_MANAGER]) &&
    hasSameItems(rule['matchDepNames'], [TYPES_NODE_DEP]) &&
    typeof rule['allowedVersions'] === 'string'
  );
}

function isMajorHold(
  rule: Settings,
  managers: readonly string[],
  dep: string,
): boolean {
  return (
    hasExactKeys(rule, [
      'matchManagers',
      'matchDepNames',
      'matchUpdateTypes',
      'enabled',
    ]) &&
    hasSameItems(rule['matchManagers'], managers) &&
    hasSameItems(rule['matchDepNames'], [dep]) &&
    hasSameItems(rule['matchUpdateTypes'], [MAJOR_UPDATE_TYPE]) &&
    rule['enabled'] === false
  );
}

function isTypescriptHold(rule: Settings): boolean {
  return isMajorHold(rule, [NPM_MANAGER], TYPESCRIPT_DEP);
}

function isNodeHold(rule: Settings): boolean {
  return isMajorHold(rule, NODE_MANAGERS, NODE_DEP);
}

// Any rule that disables updates or caps their versions, whatever it matches.
function looksLikeHold(rule: Settings): boolean {
  return rule['enabled'] === false || rule['allowedVersions'] !== undefined;
}

// The major of an .nvmrc text such as "24", "v24.14.0\n" or "24.0.0".
function readMajor(nodeVersion: string): string | undefined {
  const major = nodeVersion.trim().replace(/^v/, '').split('.')[0];
  return major !== undefined && /^\d+$/.test(major) ? major : undefined;
}

function findHoldViolations(
  rules: Settings[],
  lastNode: number,
  nodeVersion: string,
): Violation[] {
  const violations: Violation[] = [];
  const fail = (reason: string) =>
    violations.push({ subject: SUBJECT, reason });
  const major = readMajor(nodeVersion);
  const caps = rules.filter(isCapRule);
  if (
    major === undefined ||
    caps.length === 0 ||
    caps.some((cap) => cap['allowedVersions'] !== `${major}.x`)
  ) {
    fail(`the ${TYPES_NODE_DEP} cap must be the major in .nvmrc`);
  }
  if (!rules.some(isTypescriptHold)) {
    fail('a hold rule must disable TypeScript majors, and only majors');
  }
  if (!rules.some(isNodeHold)) {
    fail(
      'a hold rule must disable Node majors in the nvm and the npm manager, and only majors',
    );
  }
  if (lastNode !== -1 && rules.slice(0, lastNode).some(looksLikeHold)) {
    fail('every hold rule must come after the Node rule');
  }
  return violations;
}

// Later rules win in Renovate: the Node rule comes after every other rule,
// except that the three Hold rules, each at most once, come after it.
function hasRuleAfterNode(rules: Settings[], lastNode: number): boolean {
  const after = rules.slice(lastNode + 1);
  const kinds = [isCapRule, isTypescriptHold, isNodeHold];
  return (
    after.some((rule) => !kinds.some((kind) => kind(rule))) ||
    kinds.some((kind) => after.filter(kind).length > 1)
  );
}

function findGroupViolations(
  config: Settings,
  nodeVersion: string,
): Violation[] {
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
  const lastNode = rules.findLastIndex(isNodeRule);
  if (lastNode !== -1 && hasRuleAfterNode(rules, lastNode)) {
    fail(
      'the Node rule must come after every other packageRule, except the three hold rules, each at most once, which come after it',
    );
  }
  violations.push(...findHoldViolations(rules, lastNode, nodeVersion));
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
    if (
      /\[security\]/i.test(assembleTitle(config['commitMessagePrefix'], alerts))
    ) {
      fail('a vulnerability-alert title carries no [SECURITY] suffix');
    }
  }
  return violations;
}

function textOf(part: unknown): string {
  return typeof part === 'string' ? part : '';
}

// The title Renovate's default template assembles for one PR-opening scope:
// the root prefix, then the scope's action, its topic or groupName, extra and
// suffix; trimmed, inner whitespace collapsed.
function assembleTitle(prefix: unknown, scope: Settings): string {
  return [
    prefix,
    scope['commitMessageAction'],
    scope['commitMessageTopic'] ?? scope['groupName'],
    scope['commitMessageExtra'],
    scope['commitMessageSuffix'],
  ]
    .map(textOf)
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// The scopes that open a PR: every group rule, lockfile maintenance and
// vulnerability alerts. A missing scope is reported by findGroupViolations.
function listOpeningScopes(config: Settings): Settings[] {
  const rules = Array.isArray(config['packageRules'])
    ? config['packageRules'].filter(isRecord)
    : [];
  return [
    ...rules.filter((rule) => rule['groupName'] !== undefined),
    config['lockFileMaintenance'],
    config['vulnerabilityAlerts'],
  ].filter(isRecord);
}

function findPartViolations(config: Settings): Violation[] {
  const violations: Violation[] = [];
  const fail = (reason: string) =>
    violations.push({ subject: SUBJECT, reason });
  for (const object of collectObjects(config)) {
    if (object['commitMessage'] !== undefined) {
      fail('no commitMessage is allowed');
    }
    if (object['prTitle'] !== undefined) fail('no prTitle is allowed');
    for (const part of COMMIT_MESSAGE_PARTS) {
      if (textOf(object[part]).includes('{{')) {
        fail('a commit-message part holds no template');
      }
    }
  }
  const rules = Array.isArray(config['packageRules'])
    ? config['packageRules'].filter(isRecord)
    : [];
  for (const rule of rules) {
    if (
      rule['groupName'] !== undefined &&
      rule['commitMessageTopic'] !== undefined
    ) {
      fail('a group rule sets no commitMessageTopic');
    }
  }
  for (const scope of listOpeningScopes(config)) {
    if (typeof scope['commitMessageAction'] !== 'string') {
      fail('a scope that opens a PR sets commitMessageAction');
    }
    if (typeof scope['commitMessageExtra'] !== 'string') {
      fail('a scope that opens a PR sets commitMessageExtra');
    }
  }
  return violations;
}

async function findTitleViolations(
  title: string,
  commitConfig: CommitConfig,
): Promise<Violation[]> {
  const violations: Violation[] = [];
  if (parseCommitHeader(title)?.feature !== RENOVATE_FEATURE) {
    violations.push({
      subject: title,
      reason: `a title names the feature ${RENOVATE_FEATURE}`,
    });
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

// The Renovate rule: no commitMessage or prTitle anywhere, no template in a
// Commit-message part, every PR-opening scope sets its own action and extra
// (a group rule no topic), each title assembled from the parts names the
// feature and passes the commitlint config and the Pull-request check, and the
// base settings hold, the schedules all of Monday. Three Hold rules come last,
// after the Node rule: the @types/node cap at the major of .nvmrc (nodeVersion
// is its text), TypeScript majors disabled and Node majors disabled.
export async function findRenovateViolations(
  config: unknown,
  commitConfig: CommitConfig,
  nodeVersion: string,
): Promise<Violation[]> {
  if (!isRecord(config)) {
    return [{ subject: SUBJECT, reason: 'the config must be an object' }];
  }
  const violations = [
    ...findSettingViolations(config),
    ...findGroupViolations(config, nodeVersion),
  ];
  violations.push(...findPartViolations(config));
  for (const scope of listOpeningScopes(config)) {
    const title = assembleTitle(config['commitMessagePrefix'], scope);
    violations.push(...(await findTitleViolations(title, commitConfig)));
  }
  return violations;
}
