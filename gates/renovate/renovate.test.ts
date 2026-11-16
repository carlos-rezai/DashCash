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
// as the PRD fixes them; the Node rule covers both .nvmrc (the nvm manager)
// and engines.node (the npm manager's engines); lockfile maintenance is
// enabled; the vulnerability-alert title carries no suffix.

type CommitConfig = Awaited<ReturnType<typeof loadCommitConfig>>;
type Config = Record<string, unknown>;

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RENOVATE_JSON = join(ROOT, 'renovate.json');

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

function lockfileMaintenance(changes: Config = {}): Config {
  return {
    enabled: true,
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
    schedule: ['before 6am on monday'],
    timezone: 'Europe/Berlin',
    commitMessagePrefix: PREFIX,
    packageRules: [scopes.npmGroup, scopes.nodeGroup],
    lockFileMaintenance: scopes.lockFileMaintenance,
    vulnerabilityAlerts: scopes.vulnerabilityAlerts,
    ...changes,
  };
}

// An invented config with the base settings, an npm group, the Node group,
// lockfile maintenance and vulnerability alerts, whose parts assemble titles
// that pass every rule.
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

  async function check(config: unknown) {
    const violations = await findRenovateViolations(config, commitConfig);
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
        packageRules: [group('npm dependencies'), actions, nodeRule()],
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
          packageRules: [group('a'.repeat(44)), nodeRule()],
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
        packageRules: [group('npm dependencies'), nodeRule(narrowing)],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it.each([
      [
        'node, npm, actions',
        [nodeRule(), group('npm dependencies'), group('github actions')],
      ],
      [
        'a second npm group after the Node rule',
        [group('npm dependencies'), nodeRule(), group('github actions')],
      ],
    ])('fails the rule order %s', async (_case, packageRules) => {
      expect(await check(sampleConfig({ packageRules }))).not.toEqual([]);
    });

    it('fails a later rule without matchManagers, which applies to npm', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies'),
          nodeRule(),
          { matchUpdateTypes: ['major'], enabled: false },
        ],
      });

      expect(await check(config)).toEqual([
        {
          subject: 'renovate.json',
          reason:
            'the Node rule must come after every other packageRule for npm',
        },
      ]);
    });

    it('fails a rule without matchManagers or matchUpdateTypes, which takes over lockfile maintenance', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies'),
          { matchPackageNames: ['*'], groupName: 'all', ...parts('update') },
          nodeRule(),
        ],
      });

      expect(await check(config)).toEqual([
        {
          subject: 'renovate.json',
          reason:
            'a packageRule for npm must set matchUpdateTypes without lockFileMaintenance',
        },
      ]);
    });

    it('fails a later npm rule that disables the engines dependency type', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies'),
          nodeRule(),
          {
            matchManagers: ['npm'],
            matchUpdateTypes: PACKAGE_UPDATE_TYPES,
            matchDepTypes: ['engines'],
            enabled: false,
          },
        ],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails an npm rule without matchUpdateTypes, which takes over lockfile maintenance', async () => {
      const unrestricted = group('npm dependencies');
      Reflect.deleteProperty(unrestricted, 'matchUpdateTypes');
      const config = sampleConfig({ packageRules: [unrestricted, nodeRule()] });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails an npm rule whose matchUpdateTypes include lockFileMaintenance', async () => {
      const config = sampleConfig({
        packageRules: [
          group('npm dependencies', {
            matchUpdateTypes: [...PACKAGE_UPDATE_TYPES, 'lockFileMaintenance'],
          }),
          nodeRule(),
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

    it('fails a vulnerability-alert title with a suffix written into it', async () => {
      const message = `${VULNERABILITY_TITLE} [security]`;
      const config = sampleConfig({
        vulnerabilityAlerts: vulnerabilityAlerts({
          commitMessage: message,
          prTitle: message,
        }),
      });

      expect(await check(config)).not.toEqual([]);
    });
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
      [['before 6am on monday', 'after 10pm on friday']],
      [[]],
    ])('fails the schedule %j', async (schedule) => {
      expect(await check(sampleConfig({ schedule }))).not.toEqual([]);
    });

    it('fails a config without schedule', async () => {
      expect(await check(sampleConfigWithout('schedule'))).not.toEqual([]);
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

  it('passes the Renovate rule', async () => {
    const config = readConfig();

    expect(await findRenovateViolations(config, commitConfig)).toEqual([]);
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
