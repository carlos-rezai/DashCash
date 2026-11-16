import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { isRecord } from '../../scripts/isRecord/isRecord.ts';
import { loadCommitConfig } from '../../scripts/lintCommitMessages/lintCommitMessages.ts';
import { findRenovateViolations } from './renovate.ts';

// The Renovate config: no object sets a whole commitMessage or prTitle; every
// title is assembled from the Commit-message parts the way Renovate's default
// template does (the root prefix, then each PR-opening scope's action, its
// topic or groupName, its extra and its suffix; trimmed, inner whitespace
// collapsed), and each assembled title names the feature supply-chain,
// passes the commitlint config and passes the Pull-request check on a
// renovate/* branch; no part holds a template; every PR-opening scope sets its
// own action and extra, and a group rule sets no topic. The base settings stay
// as the PRD fixes them, the schedule all of Monday; the Node rule covers both
// .nvmrc (the nvm manager) and engines.node (the npm manager's engines);
// lockfile maintenance is enabled, on all of Monday; the vulnerability-alert
// title carries no suffix. Three Hold rules come last, after the Node rule:
// the @types/node cap at the major in .nvmrc, TypeScript majors disabled and
// Node majors disabled; no other rule comes after the Node rule, and no hold
// reaches lockfile maintenance.

type CommitConfig = Awaited<ReturnType<typeof loadCommitConfig>>;
type Config = Record<string, unknown>;

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RENOVATE_JSON = join(ROOT, 'renovate.json');
const NVMRC = join(ROOT, '.nvmrc');

// The text of an invented .nvmrc, as the gate test reads it.
const NODE_VERSION = '24.14.0\n';
const SCHEDULE = ['on monday'];

const PRESETS = [
  'config:recommended',
  'helpers:pinGitHubActionDigests',
  ':disableDependencyDashboard',
];

const PREFIX = 'chore: [supply-chain]';
const NPM_TITLE = 'chore: [supply-chain] update npm dependencies';
const ACTIONS_TITLE = 'chore: [supply-chain] update github actions';
const NODE_TITLE = 'chore: [supply-chain] update node';
const LOCKFILE_TITLE = 'chore: [supply-chain] refresh the lockfile';
const VULNERABILITY_TITLE = 'chore: [supply-chain] fix vulnerable dependencies';

const NO_COMMIT_MESSAGE = {
  subject: 'renovate.json',
  reason: 'no commitMessage is allowed',
};
const NO_PR_TITLE = {
  subject: 'renovate.json',
  reason: 'no prTitle is allowed',
};
const NO_TEMPLATE = {
  subject: 'renovate.json',
  reason: 'a commit-message part holds no template',
};
const SETS_ACTION = {
  subject: 'renovate.json',
  reason: 'a scope that opens a PR sets commitMessageAction',
};
const SETS_EXTRA = {
  subject: 'renovate.json',
  reason: 'a scope that opens a PR sets commitMessageExtra',
};
const NO_GROUP_TOPIC = {
  subject: 'renovate.json',
  reason: 'a group rule sets no commitMessageTopic',
};
const RULE_ORDER = {
  subject: 'renovate.json',
  reason:
    'the Node rule must come after every other packageRule, except the three hold rules, each at most once, which come after it',
};
const LOCKFILE_RULE = {
  subject: 'renovate.json',
  reason:
    'a packageRule for npm must set matchUpdateTypes without lockFileMaintenance',
};
const CAP_MAJOR = {
  subject: 'renovate.json',
  reason: 'the @types/node cap must be the major in .nvmrc',
};
const TYPESCRIPT_HOLD = {
  subject: 'renovate.json',
  reason: 'a hold rule must disable TypeScript majors, and only majors',
};
const NODE_HOLD = {
  subject: 'renovate.json',
  reason:
    'a hold rule must disable Node majors in the nvm and the npm manager, and only majors',
};
const HOLD_ORDER = {
  subject: 'renovate.json',
  reason: 'every hold rule must come after the Node rule',
};
const SCHEDULE_RULE = {
  subject: 'renovate.json',
  reason: 'schedule must be ["on monday"]',
};
const LOCKFILE_SCHEDULE = {
  subject: 'renovate.json',
  reason: 'lockFileMaintenance schedule must be ["on monday"]',
};

// The update types an npm rule may match: every one but lockFileMaintenance,
// which Renovate may also run the packageRules against.
const PACKAGE_UPDATE_TYPES = [
  'major',
  'minor',
  'patch',
  'pin',
  'pinDigest',
  'digest',
  'rollback',
  'bump',
  'replacement',
];

// The parts every PR-opening scope sets for itself, so that no update type's
// default (an upper-case action, a version in the extra) reaches its title.
function parts(action: string): Config {
  return {
    commitMessageAction: action,
    commitMessageExtra: '',
    commitMessageSuffix: '',
  };
}

// An npm group, whose title topic is its groupName.
function group(groupName: string, changes: Config = {}): Config {
  return {
    matchManagers: ['npm'],
    matchUpdateTypes: PACKAGE_UPDATE_TYPES,
    groupName,
    ...parts('update'),
    ...changes,
  };
}

// The Node group: the dependency node in both the nvm manager (.nvmrc) and
// the npm manager's engines (engines.node), unless the changes narrow it.
function nodeRule(changes: Config = {}): Config {
  return {
    matchManagers: ['nvm', 'npm'],
    matchDepNames: ['node'],
    groupName: 'node',
    ...parts('update'),
    ...changes,
  };
}

// The Hold rules: @types/node capped at a major, TypeScript and Node majors
// disabled. None opens a PR, so none sets Commit-message parts.
function typesNodeCap(changes: Config = {}): Config {
  return {
    matchManagers: ['npm'],
    matchDepNames: ['@types/node'],
    allowedVersions: '24.x',
    ...changes,
  };
}

function typescriptHold(changes: Config = {}): Config {
  return {
    matchManagers: ['npm'],
    matchDepNames: ['typescript'],
    matchUpdateTypes: ['major'],
    enabled: false,
    ...changes,
  };
}

function nodeHold(changes: Config = {}): Config {
  return {
    matchManagers: ['nvm', 'npm'],
    matchDepNames: ['node'],
    matchUpdateTypes: ['major'],
    enabled: false,
    ...changes,
  };
}

// The three Hold rules, in their order after the Node rule.
function holdRules(): Config[] {
  return [typesNodeCap(), typescriptHold(), nodeHold()];
}

// A rule without one of its keys.
function without(rule: Config, key: string): Config {
  const copy = { ...rule };
  Reflect.deleteProperty(copy, key);
  return copy;
}

function lockfileMaintenance(changes: Config = {}): Config {
  return {
    enabled: true,
    schedule: [...SCHEDULE],
    ...parts('refresh'),
    commitMessageTopic: 'the lockfile',
    ...changes,
  };
}

function vulnerabilityAlerts(changes: Config = {}): Config {
  return {
    ...parts('fix'),
    commitMessageTopic: 'vulnerable dependencies',
    ...changes,
  };
}

// The scopes of the sample config that open a PR.
type Scopes = {
  npmGroup: Config;
  nodeGroup: Config;
  lockFileMaintenance: Config;
  vulnerabilityAlerts: Config;
};
type ScopeName = keyof Scopes;

const SCOPE_NAMES: ScopeName[] = [
  'npmGroup',
  'nodeGroup',
  'lockFileMaintenance',
  'vulnerabilityAlerts',
];

function sampleScopes(): Scopes {
  return {
    npmGroup: group('npm dependencies'),
    nodeGroup: nodeRule(),
    lockFileMaintenance: lockfileMaintenance(),
    vulnerabilityAlerts: vulnerabilityAlerts(),
  };
}

function configFrom(scopes: Scopes, changes: Config = {}): Config {
  return {
    $schema: 'https://docs.renovatebot.com/renovate-schema.json',
    extends: [...PRESETS],
    semanticCommits: 'disabled',
    minimumReleaseAge: '14 days',
    schedule: [...SCHEDULE],
    timezone: 'Europe/Berlin',
    commitMessagePrefix: PREFIX,
    packageRules: [scopes.npmGroup, scopes.nodeGroup, ...holdRules()],
    lockFileMaintenance: scopes.lockFileMaintenance,
    vulnerabilityAlerts: scopes.vulnerabilityAlerts,
    ...changes,
  };
}

// An invented config with the base settings, an npm group, the Node group,
// the three Hold rules, lockfile maintenance and vulnerability alerts, whose
// parts assemble titles that pass every rule.
function sampleConfig(changes: Config = {}): Config {
  return configFrom(sampleScopes(), changes);
}

// The sample config without the named setting.
function sampleConfigWithout(setting: string): Config {
  const config = sampleConfig();
  Reflect.deleteProperty(config, setting);
  return config;
}

// The sample config with the changes merged into one of its scopes.
function sampleConfigWithScope(name: ScopeName, changes: Config): Config {
  const scopes = sampleScopes();
  return configFrom({ ...scopes, [name]: { ...scopes[name], ...changes } });
}

// The sample config with one setting removed from one of its scopes.
function sampleConfigWithoutPart(name: ScopeName, part: string): Config {
  const scopes = sampleScopes();
  const scope = { ...scopes[name] };
  Reflect.deleteProperty(scope, part);
  return configFrom({ ...scopes, [name]: scope });
}

// Every value a config holds under the given key, at any depth.
function collectValues(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectValues(item, key));
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([name, inner]) => [
    ...(name === key ? [inner] : []),
    ...collectValues(inner, key),
  ]);
}

// The title Renovate's default template assembles for one PR-opening scope.
function assembleTitle(prefix: unknown, scope: Config): string {
  return [
    prefix,
    scope['commitMessageAction'],
    scope['commitMessageTopic'] ?? scope['groupName'],
    scope['commitMessageExtra'],
    scope['commitMessageSuffix'],
  ]
    .map((part) => (typeof part === 'string' ? part : ''))
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// The scopes of a config that open a PR: every group rule, then lockfile
// maintenance and vulnerability alerts.
function listOpeningScopes(config: Config): Config[] {
  const rules = Array.isArray(config['packageRules'])
    ? config['packageRules'].filter(isRecord)
    : [];
  return [
    ...rules.filter((rule) => rule['groupName'] !== undefined),
    config['lockFileMaintenance'],
    config['vulnerabilityAlerts'],
  ].filter(isRecord);
}

describe('the Renovate rule on invented configs', () => {
  let commitConfig: CommitConfig;

  beforeAll(async () => {
    commitConfig = await loadCommitConfig(ROOT);
  });

  async function check(config: unknown, nodeVersion = NODE_VERSION) {
    const violations = await findRenovateViolations(
      config,
      commitConfig,
      nodeVersion,
    );
    for (const violation of violations) {
      expect(violation.reason, violation.subject).not.toBe('');
    }
    return violations;
  }

  it('passes the sample config', async () => {
    expect(await check(sampleConfig())).toEqual([]);
  });

  it('passes a config with several groups', async () => {
    const config = sampleConfig({
      packageRules: [
        group('npm dependencies'),
        group('github actions'),
        nodeRule(),
        ...holdRules(),
      ],
    });

    expect(await check(config)).toEqual([]);
  });

  describe('the input checks', () => {
    it.each([
      ['an array', []],
      ['null', null],
      ['a string', 'renovate'],
    ])('fails %s as a config, with one violation', async (_case, config) => {
      expect(await check(config)).toEqual([
        { subject: 'renovate.json', reason: 'the config must be an object' },
      ]);
    });

    it('passes an explicit automerge false at the root', async () => {
      expect(await check(sampleConfig({ automerge: false }))).toEqual([]);
    });

    it('passes an explicit automerge false in a group', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies', { automerge: false }),
          nodeRule(),
          ...holdRules(),
        ],
      });

      expect(await check(config)).toEqual([]);
    });
  });

  describe('the whole messages and titles', () => {
    it.each([
      ['at the root', sampleConfig({ commitMessage: NPM_TITLE })],
      [
        'in the npm group',
        sampleConfigWithScope('npmGroup', { commitMessage: NPM_TITLE }),
      ],
      [
        'in the Node group',
        sampleConfigWithScope('nodeGroup', { commitMessage: NODE_TITLE }),
      ],
      [
        'in lockfile maintenance',
        sampleConfigWithScope('lockFileMaintenance', {
          commitMessage: LOCKFILE_TITLE,
        }),
      ],
      [
        'in vulnerability alerts',
        sampleConfigWithScope('vulnerabilityAlerts', {
          commitMessage: VULNERABILITY_TITLE,
        }),
      ],
      [
        'that is not a string',
        sampleConfigWithScope('npmGroup', { commitMessage: 42 }),
      ],
    ])('fails a commitMessage %s', async (_case, config) => {
      expect(await check(config)).toContainEqual(NO_COMMIT_MESSAGE);
    });

    it.each([
      ['at the root', sampleConfig({ prTitle: NPM_TITLE })],
      [
        'in the npm group',
        sampleConfigWithScope('npmGroup', { prTitle: NPM_TITLE }),
      ],
      [
        'in the Node group',
        sampleConfigWithScope('nodeGroup', { prTitle: NODE_TITLE }),
      ],
      [
        'in lockfile maintenance',
        sampleConfigWithScope('lockFileMaintenance', {
          prTitle: LOCKFILE_TITLE,
        }),
      ],
      [
        'in vulnerability alerts',
        sampleConfigWithScope('vulnerabilityAlerts', {
          prTitle: VULNERABILITY_TITLE,
        }),
      ],
      [
        'that is not a string',
        sampleConfigWithScope('npmGroup', { prTitle: 42 }),
      ],
    ])('fails a prTitle %s', async (_case, config) => {
      expect(await check(config)).toContainEqual(NO_PR_TITLE);
    });

    it('fails a commitMessage and a prTitle that match each other', async () => {
      const config = sampleConfigWithScope('npmGroup', {
        commitMessage: NPM_TITLE,
        prTitle: NPM_TITLE,
      });

      const violations = await check(config);

      expect(violations).toHaveLength(2);
      expect(violations).toEqual(
        expect.arrayContaining([NO_COMMIT_MESSAGE, NO_PR_TITLE]),
      );
    });
  });

  describe('the Commit-message parts', () => {
    it.each([
      [
        'the prefix',
        sampleConfig({ commitMessagePrefix: 'chore: [{{manager}}]' }),
      ],
      [
        'an action',
        sampleConfigWithScope('npmGroup', {
          commitMessageAction: '{{updateType}}',
        }),
      ],
      [
        'a topic',
        sampleConfigWithScope('lockFileMaintenance', {
          commitMessageTopic: '{{manager}} lockfile',
        }),
      ],
      [
        'an extra',
        sampleConfigWithScope('nodeGroup', {
          commitMessageExtra: 'to {{newVersion}}',
        }),
      ],
      [
        'a suffix',
        sampleConfigWithScope('vulnerabilityAlerts', {
          commitMessageSuffix: '{{depName}}',
        }),
      ],
      [
        'a triple-brace template',
        sampleConfigWithScope('npmGroup', {
          commitMessageExtra: '{{{newVersion}}}',
        }),
      ],
    ])('fails a template in %s', async (_case, config) => {
      expect(await check(config)).toContainEqual(NO_TEMPLATE);
    });

    it.each(SCOPE_NAMES)(
      'fails %s leaving its action to Renovate',
      async (name) => {
        const config = sampleConfigWithoutPart(name, 'commitMessageAction');

        expect(await check(config)).toContainEqual(SETS_ACTION);
      },
    );

    it.each(SCOPE_NAMES)(
      'fails %s leaving its extra to Renovate',
      async (name) => {
        const config = sampleConfigWithoutPart(name, 'commitMessageExtra');

        expect(await check(config)).toContainEqual(SETS_EXTRA);
      },
    );

    it('fails a second group leaving its action to Renovate', async () => {
      const actions = group('github actions');
      Reflect.deleteProperty(actions, 'commitMessageAction');
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies'),
          actions,
          nodeRule(),
          ...holdRules(),
        ],
      });

      expect(await check(config)).toContainEqual(SETS_ACTION);
    });

    it.each([
      ['the npm group', 'npmGroup', 'npm dependencies'],
      ['the Node group', 'nodeGroup', 'node'],
    ] as const)(
      'fails %s setting a topic, with one violation',
      async (_case, name, topic) => {
        const config = sampleConfigWithScope(name, {
          commitMessageTopic: topic,
        });

        expect(await check(config)).toEqual([NO_GROUP_TOPIC]);
      },
    );
  });

  describe('the assembled titles', () => {
    it.each([
      [
        'chore: [quality-gates] update npm dependencies',
        sampleConfig({ commitMessagePrefix: 'chore: [quality-gates]' }),
      ],
      [
        'chore: [csv-import] update npm dependencies',
        sampleConfig({ commitMessagePrefix: 'chore: [csv-import]' }),
      ],
    ])('fails %s, which names another feature', async (title, config) => {
      expect(await check(config)).toContainEqual(
        expect.objectContaining({ subject: title }),
      );
    });

    it.each([
      [
        'chore: update npm dependencies',
        sampleConfig({ commitMessagePrefix: 'chore:' }),
      ],
      [
        'chore(deps): update npm dependencies',
        sampleConfig({ commitMessagePrefix: 'chore(deps):' }),
      ],
      [
        'deps: [supply-chain] update npm dependencies',
        sampleConfig({ commitMessagePrefix: 'deps: [supply-chain]' }),
      ],
      [
        'chore: [supply-chain] Update npm dependencies',
        sampleConfigWithScope('npmGroup', { commitMessageAction: 'Update' }),
      ],
      [
        `chore: [supply-chain] update ${'a'.repeat(44)}`,
        sampleConfig({
          packageRules: [group('a'.repeat(44)), nodeRule(), ...holdRules()],
        }),
      ],
      [
        'chore: [supply-chain] update npm dependencies To v2',
        sampleConfigWithScope('npmGroup', { commitMessageExtra: 'To v2' }),
      ],
      [
        'chore: [supply-chain] update npm dependencies .',
        sampleConfigWithScope('npmGroup', { commitMessageSuffix: '.' }),
      ],
      [
        'chore: [supply-chain] Update node',
        sampleConfigWithScope('nodeGroup', { commitMessageAction: 'Update' }),
      ],
      [
        'chore: [supply-chain] update github Actions',
        sampleConfig({
          packageRules: [
            group('npm dependencies'),
            group('github Actions'),
            nodeRule(),
            ...holdRules(),
          ],
        }),
      ],
      [
        'chore: [supply-chain] Refresh the lockfile',
        sampleConfigWithScope('lockFileMaintenance', {
          commitMessageAction: 'Refresh',
        }),
      ],
      [
        'chore: [supply-chain] refresh The lockfile',
        sampleConfigWithScope('lockFileMaintenance', {
          commitMessageTopic: 'The lockfile',
        }),
      ],
      [
        'chore: [supply-chain] Fix vulnerable dependencies',
        sampleConfigWithScope('vulnerabilityAlerts', {
          commitMessageAction: 'Fix',
        }),
      ],
      [
        'chore: [supply-chain] fix vulnerable dependencies #12',
        sampleConfigWithScope('vulnerabilityAlerts', {
          commitMessageExtra: '#12',
        }),
      ],
    ])(
      'fails %s, which the commitlint config rejects',
      async (title, config) => {
        expect(await check(config)).toContainEqual(
          expect.objectContaining({ subject: title }),
        );
      },
    );

    it.each([
      // Pass the commitlint config, fail the Pull-request check.
      [
        'chore: [supply-chain] 01 update npm dependencies',
        sampleConfig({ commitMessagePrefix: 'chore: [supply-chain] 01' }),
      ],
      [
        'feat: [supply-chain] update npm dependencies',
        sampleConfig({ commitMessagePrefix: 'feat: [supply-chain]' }),
      ],
      [
        'ci: [supply-chain] update npm dependencies',
        sampleConfig({ commitMessagePrefix: 'ci: [supply-chain]' }),
      ],
    ])(
      'fails %s, which the Pull-request check rejects',
      async (title, config) => {
        expect(await check(config)).toContainEqual(
          expect.objectContaining({ subject: title }),
        );
      },
    );

    it('collapses the whitespace around a part before it checks the title', async () => {
      const config = sampleConfigWithScope('npmGroup', {
        commitMessageAction: '  Update  ',
      });

      expect(await check(config)).toContainEqual(
        expect.objectContaining({
          subject: 'chore: [supply-chain] Update npm dependencies',
        }),
      );
    });

    it('fails a config without a prefix', async () => {
      expect(
        await check(sampleConfigWithout('commitMessagePrefix')),
      ).toContainEqual(
        expect.objectContaining({ subject: 'update npm dependencies' }),
      );
    });
  });

  describe('the groups', () => {
    it.each([
      ['only .nvmrc', { matchManagers: ['nvm'] }],
      [
        'only engines.node',
        { matchManagers: ['npm'], matchDepTypes: ['engines'] },
      ],
      ['only the engines dependency type', { matchDepTypes: ['engines'] }],
      ['nothing, being disabled', { enabled: false }],
      ['only .nvmrc, by file name', { matchFileNames: ['.nvmrc'] }],
      ['only package.json, by file name', { matchFileNames: ['package.json'] }],
    ])('fails a Node rule covering %s', async (_case, narrowing) => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies'),
          nodeRule(narrowing),
          ...holdRules(),
        ],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it.each([
      [
        'node, npm, actions',
        [
          nodeRule(),
          group('npm dependencies'),
          group('github actions'),
          ...holdRules(),
        ],
      ],
      [
        'a second npm group after the Node rule',
        [
          group('npm dependencies'),
          nodeRule(),
          group('github actions'),
          ...holdRules(),
        ],
      ],
      [
        'a second npm group after the Hold rules',
        [
          group('npm dependencies'),
          nodeRule(),
          ...holdRules(),
          group('github actions'),
        ],
      ],
    ])('fails the rule order %s', async (_case, packageRules) => {
      expect(await check(sampleConfig({ packageRules }))).not.toEqual([]);
    });

    it('fails a later rule without matchManagers, which applies to npm', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies'),
          nodeRule(),
          ...holdRules(),
          { matchUpdateTypes: ['major'], enabled: false },
        ],
      });

      expect(await check(config)).toEqual([RULE_ORDER]);
    });

    it('fails a rule without matchManagers or matchUpdateTypes, which takes over lockfile maintenance', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies'),
          { matchPackageNames: ['*'], groupName: 'all', ...parts('update') },
          nodeRule(),
          ...holdRules(),
        ],
      });

      expect(await check(config)).toEqual([LOCKFILE_RULE]);
    });

    it('fails a later npm rule that disables the engines dependency type', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies'),
          nodeRule(),
          ...holdRules(),
          {
            matchManagers: ['npm'],
            matchUpdateTypes: PACKAGE_UPDATE_TYPES,
            matchDepTypes: ['engines'],
            enabled: false,
          },
        ],
      });

      expect(await check(config)).toContainEqual(RULE_ORDER);
    });

    it('fails an npm rule without matchUpdateTypes, which takes over lockfile maintenance', async () => {
      const unrestricted = group('npm dependencies');
      Reflect.deleteProperty(unrestricted, 'matchUpdateTypes');
      const config = sampleConfig({
        packageRules: [unrestricted, nodeRule(), ...holdRules()],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails an npm rule whose matchUpdateTypes include lockFileMaintenance', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies', {
            matchUpdateTypes: [...PACKAGE_UPDATE_TYPES, 'lockFileMaintenance'],
          }),
          nodeRule(),
          ...holdRules(),
        ],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails lockfile maintenance disabled', async () => {
      const config = sampleConfig({
        lockFileMaintenance: lockfileMaintenance({ enabled: false }),
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails lockfile maintenance left at its disabled default', async () => {
      const lockfile = lockfileMaintenance();
      Reflect.deleteProperty(lockfile, 'enabled');
      const config = sampleConfig({ lockFileMaintenance: lockfile });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails a config without vulnerability alerts', async () => {
      expect(
        await check(sampleConfigWithout('vulnerabilityAlerts')),
      ).not.toEqual([]);
    });

    it('fails a config without lockfile maintenance', async () => {
      expect(
        await check(sampleConfigWithout('lockFileMaintenance')),
      ).not.toEqual([]);
    });

    it('fails a vulnerability-alert title with the [SECURITY] suffix', async () => {
      const config = sampleConfig({
        vulnerabilityAlerts: vulnerabilityAlerts({
          commitMessageSuffix: '[SECURITY]',
        }),
      });

      expect(await check(config)).not.toEqual([]);
    });

    it.each([
      ['commitMessageExtra', { commitMessageExtra: '[security]' }],
      [
        'commitMessageTopic',
        { commitMessageTopic: 'vulnerable dependencies [Security]' },
      ],
    ])(
      'fails a vulnerability-alert title with the tag written into %s',
      async (_part, changes) => {
        const config = sampleConfig({
          vulnerabilityAlerts: vulnerabilityAlerts(changes),
        });

        expect(await check(config)).toContainEqual({
          subject: 'renovate.json',
          reason: 'a vulnerability-alert title carries no [SECURITY] suffix',
        });
      },
    );
  });

  describe('the Hold rules', () => {
    // The sample config with its Hold rules replaced.
    function withHolds(holds: Config[]): Config {
      return sampleConfig({
        packageRules: [group('npm dependencies'), nodeRule(), ...holds],
      });
    }

    it.each(['24', '24\n', '24.14.0', 'v24.14.0\n', '24.0.0\n'])(
      'passes a cap of 24.x with the .nvmrc %j',
      async (nodeVersion) => {
        expect(await check(sampleConfig(), nodeVersion)).toEqual([]);
      },
    );

    it.each(['23.x', '25.x', '2.x', '240.x'])(
      'fails the cap %s with the .nvmrc 24.14.0, with one violation',
      async (allowedVersions) => {
        const config = withHolds([
          typesNodeCap({ allowedVersions }),
          typescriptHold(),
          nodeHold(),
        ]);

        expect(await check(config, '24.14.0\n')).toEqual([CAP_MAJOR]);
      },
    );

    it.each(['25.0.0\n', '23.11.0\n', '2.0.0\n'])(
      'fails the cap 24.x with the .nvmrc %j, with one violation',
      async (nodeVersion) => {
        expect(await check(sampleConfig(), nodeVersion)).toEqual([CAP_MAJOR]);
      },
    );

    it('fails a config without the TypeScript hold, with one violation', async () => {
      const config = withHolds([typesNodeCap(), nodeHold()]);

      expect(await check(config)).toEqual([TYPESCRIPT_HOLD]);
    });

    it('fails a config without the Node hold, with one violation', async () => {
      const config = withHolds([typesNodeCap(), typescriptHold()]);

      expect(await check(config)).toEqual([NODE_HOLD]);
    });

    it('fails a config without any Hold rule', async () => {
      const violations = await check(withHolds([]));

      expect(violations).toContainEqual(CAP_MAJOR);
      expect(violations).toContainEqual(TYPESCRIPT_HOLD);
      expect(violations).toContainEqual(NODE_HOLD);
    });

    it('fails a config without the @types/node cap, with one violation', async () => {
      const config = withHolds([typescriptHold(), nodeHold()]);

      expect(await check(config)).toEqual([CAP_MAJOR]);
    });

    it.each([
      ['minors too', typescriptHold({ matchUpdateTypes: ['major', 'minor'] })],
      [
        'patches too',
        typescriptHold({ matchUpdateTypes: ['major', 'minor', 'patch'] }),
      ],
      ['every update type', without(typescriptHold(), 'matchUpdateTypes')],
      ['nothing, being enabled', typescriptHold({ enabled: true })],
      ['another package', typescriptHold({ matchDepNames: ['tslib'] })],
    ])('fails a TypeScript hold disabling %s', async (_case, typescript) => {
      const config = withHolds([typesNodeCap(), typescript, nodeHold()]);

      expect(await check(config)).toContainEqual(TYPESCRIPT_HOLD);
    });

    it.each([
      ['minors too', nodeHold({ matchUpdateTypes: ['major', 'minor'] })],
      [
        'patches too',
        nodeHold({ matchUpdateTypes: ['major', 'minor', 'patch'] }),
      ],
      ['every update type', without(nodeHold(), 'matchUpdateTypes')],
      ['nothing, being enabled', nodeHold({ enabled: true })],
      ['majors in .nvmrc only', nodeHold({ matchManagers: ['nvm'] })],
      ['majors in engines.node only', nodeHold({ matchManagers: ['npm'] })],
    ])('fails a Node hold disabling %s', async (_case, node) => {
      const config = withHolds([typesNodeCap(), typescriptHold(), node]);

      expect(await check(config)).toContainEqual(NODE_HOLD);
    });

    it.each([
      ['the @types/node cap', 0],
      ['the TypeScript hold', 1],
      ['the Node hold', 2],
    ])(
      'fails %s before the Node rule, with one violation',
      async (_case, index) => {
        const holds = holdRules();
        const [moved] = holds.splice(index, 1);
        const config = sampleConfig({
          packageRules: [
            group('npm dependencies'),
            ...(moved === undefined ? [] : [moved]),
            nodeRule(),
            ...holds,
          ],
        });

        expect(await check(config)).toEqual([HOLD_ORDER]);
      },
    );

    it('fails a Hold rule before the npm group', async () => {
      const [cap, ...rest] = holdRules();
      const config = sampleConfig({
        packageRules: [
          ...(cap === undefined ? [] : [cap]),
          group('npm dependencies'),
          nodeRule(),
          ...rest,
        ],
      });

      expect(await check(config)).toEqual([HOLD_ORDER]);
    });

    it.each([
      [
        'a fourth hold',
        {
          matchManagers: ['npm'],
          matchDepNames: ['vite'],
          matchUpdateTypes: ['major'],
          enabled: false,
        },
      ],
      [
        'a second cap',
        {
          matchManagers: ['npm'],
          matchDepNames: ['@types/react'],
          allowedVersions: '18.x',
        },
      ],
      [
        'a rule that sets nothing',
        { matchManagers: ['npm'], matchDepNames: ['vite'] },
      ],
    ])(
      'fails %s after the Node rule, with one violation',
      async (_case, rule) => {
        const config = withHolds([...holdRules(), rule]);

        expect(await check(config)).toEqual([RULE_ORDER]);
      },
    );

    it.each([
      ['the @types/node cap', typesNodeCap()],
      ['the TypeScript hold', typescriptHold()],
      ['the Node hold', nodeHold()],
    ])(
      'fails %s twice after the Node rule, with one violation',
      async (_case, duplicate) => {
        const config = withHolds([...holdRules(), duplicate]);

        expect(await check(config)).toEqual([RULE_ORDER]);
      },
    );

    it.each([
      [
        'without a dependency or an update type',
        { matchManagers: ['npm'], enabled: false },
      ],
      [
        'whose update types include lockFileMaintenance',
        {
          matchManagers: ['npm'],
          matchUpdateTypes: ['major', 'lockFileMaintenance'],
          enabled: false,
        },
      ],
    ])(
      'fails a hold %s, which reaches lockfile maintenance',
      async (_case, rule) => {
        const violations = await check(withHolds([...holdRules(), rule]));

        expect(violations).toHaveLength(2);
        expect(violations).toEqual(
          expect.arrayContaining([RULE_ORDER, LOCKFILE_RULE]),
        );
      },
    );
  });

  describe('the base settings', () => {
    it.each([
      ['without config:recommended', [PRESETS[1], PRESETS[2]]],
      ['without helpers:pinGitHubActionDigests', [PRESETS[0], PRESETS[2]]],
      ['without :disableDependencyDashboard', [PRESETS[0], PRESETS[1]]],
      ['with another preset', [...PRESETS, ':automergeMinor']],
      ['with config:best-practices instead', ['config:best-practices']],
      ['empty', []],
    ])('fails the presets %s', async (_case, presets) => {
      expect(await check(sampleConfig({ extends: presets }))).not.toEqual([]);
    });

    it('fails a config without presets', async () => {
      expect(await check(sampleConfigWithout('extends'))).not.toEqual([]);
    });

    it.each(['enabled', 'auto'])(
      'fails semanticCommits %s',
      async (semanticCommits) => {
        expect(await check(sampleConfig({ semanticCommits }))).not.toEqual([]);
      },
    );

    it('fails a config without semanticCommits', async () => {
      expect(await check(sampleConfigWithout('semanticCommits'))).not.toEqual(
        [],
      );
    });

    it('fails a commitBody', async () => {
      const config = sampleConfig({ commitBody: 'Signed-off-by: sample' });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails a commitBody in a group', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies', { commitBody: 'sample body' }),
          nodeRule(),
          ...holdRules(),
        ],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails automerge', async () => {
      expect(await check(sampleConfig({ automerge: true }))).not.toEqual([]);
    });

    it('fails automerge in a group', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies', { automerge: true }),
          nodeRule(),
          ...holdRules(),
        ],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it.each(['3 days', '7 days', '0 days'])(
      'fails minimumReleaseAge %s',
      async (minimumReleaseAge) => {
        expect(await check(sampleConfig({ minimumReleaseAge }))).not.toEqual(
          [],
        );
      },
    );

    it('fails a config without minimumReleaseAge', async () => {
      expect(await check(sampleConfigWithout('minimumReleaseAge'))).not.toEqual(
        [],
      );
    });

    it.each([
      [['at any time']],
      [['before 6am on tuesday']],
      [['on monday', 'after 10pm on friday']],
      [[]],
    ])('fails the schedule %j', async (schedule) => {
      expect(await check(sampleConfig({ schedule }))).not.toEqual([]);
    });

    it.each([[['before 6am on monday']], [['on tuesday']]])(
      'fails the schedule %j, which is not all of Monday',
      async (schedule) => {
        expect(await check(sampleConfig({ schedule }))).toContainEqual(
          SCHEDULE_RULE,
        );
      },
    );

    it('fails a config without schedule', async () => {
      expect(await check(sampleConfigWithout('schedule'))).toContainEqual(
        SCHEDULE_RULE,
      );
    });

    it.each([
      [['before 4am on monday']],
      [['before 6am on monday']],
      [['on tuesday']],
      [['on monday', 'on friday']],
      [[]],
    ])('fails the lockfile maintenance schedule %j', async (schedule) => {
      const config = sampleConfig({
        lockFileMaintenance: lockfileMaintenance({ schedule }),
      });

      expect(await check(config)).toContainEqual(LOCKFILE_SCHEDULE);
    });

    it('fails lockfile maintenance left at its default schedule', async () => {
      const config = sampleConfig({
        lockFileMaintenance: without(lockfileMaintenance(), 'schedule'),
      });

      expect(await check(config)).toEqual([LOCKFILE_SCHEDULE]);
    });

    it.each(['UTC', 'Europe/London'])('fails the timezone %s', async (zone) => {
      expect(await check(sampleConfig({ timezone: zone }))).not.toEqual([]);
    });

    it('fails a config without timezone', async () => {
      expect(await check(sampleConfigWithout('timezone'))).not.toEqual([]);
    });

    it('passes the default branch prefix written out', async () => {
      expect(await check(sampleConfig({ branchPrefix: 'renovate/' }))).toEqual(
        [],
      );
    });

    it.each(['deps/', 'feat/', 'renovate-'])(
      'fails the branch prefix %s',
      async (branchPrefix) => {
        expect(await check(sampleConfig({ branchPrefix }))).not.toEqual([]);
      },
    );
  });
});

describe('renovate.json', () => {
  let commitConfig: CommitConfig;

  beforeAll(async () => {
    commitConfig = await loadCommitConfig(ROOT);
  });

  function readConfig(): Config {
    expect(existsSync(RENOVATE_JSON), 'renovate.json is missing').toBe(true);
    const config: unknown = JSON.parse(readFileSync(RENOVATE_JSON, 'utf8'));
    expect(isRecord(config), 'renovate.json is not an object').toBe(true);
    return isRecord(config) ? config : {};
  }

  function readNodeVersion(): string {
    expect(existsSync(NVMRC), '.nvmrc is missing').toBe(true);
    return readFileSync(NVMRC, 'utf8');
  }

  function readRules(): Config[] {
    const rules = readConfig()['packageRules'];
    return Array.isArray(rules) ? rules.filter(isRecord) : [];
  }

  it('passes the Renovate rule with the committed .nvmrc', async () => {
    const config = readConfig();

    expect(
      await findRenovateViolations(config, commitConfig, readNodeVersion()),
    ).toEqual([]);
  });

  it('caps @types/node at 24.x while .nvmrc holds 24', () => {
    expect(readNodeVersion().trim().replace(/^v/, '').split('.')[0]).toBe('24');
    expect(readRules().at(-3)).toEqual({
      matchManagers: ['npm'],
      matchDepNames: ['@types/node'],
      allowedVersions: '24.x',
    });
  });

  it('ends its packageRules with the TypeScript hold and the Node hold, majors only', () => {
    expect(readRules().slice(-2)).toEqual([
      {
        matchManagers: ['npm'],
        matchDepNames: ['typescript'],
        matchUpdateTypes: ['major'],
        enabled: false,
      },
      {
        matchManagers: ['nvm', 'npm'],
        matchDepNames: ['node'],
        matchUpdateTypes: ['major'],
        enabled: false,
      },
    ]);
  });

  it('keeps the Node group, for minors and patches, right before the Hold rules', () => {
    const node = readRules().at(-4);

    expect(node).toMatchObject({
      matchManagers: ['nvm', 'npm'],
      matchDepNames: ['node'],
      groupName: 'node',
    });
    expect(node).not.toHaveProperty('matchUpdateTypes');
    expect(node).not.toHaveProperty('enabled', false);
  });

  it('runs on all of Monday, lockfile maintenance too', () => {
    const config = readConfig();
    const lockfile = config['lockFileMaintenance'];

    expect(config['schedule']).toEqual(['on monday']);
    expect(isRecord(lockfile) ? lockfile['schedule'] : undefined).toEqual([
      'on monday',
    ]);
  });

  it.each(['commitMessage', 'prTitle'])('sets no %s anywhere', (key) => {
    expect(collectValues(readConfig(), key)).toEqual([]);
  });

  it('assembles exactly the five titles from its parts', () => {
    const config = readConfig();
    const prefix = config['commitMessagePrefix'];

    expect(
      listOpeningScopes(config).map((scope) => assembleTitle(prefix, scope)),
    ).toEqual([
      NPM_TITLE,
      ACTIONS_TITLE,
      NODE_TITLE,
      LOCKFILE_TITLE,
      VULNERABILITY_TITLE,
    ]);
  });
});
