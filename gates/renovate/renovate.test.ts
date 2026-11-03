import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadCommitConfig } from '../../scripts/lintCommitMessages/lintCommitMessages.ts';
import { findRenovateViolations } from './renovate.ts';

// The Renovate config: every commit message is fixed text naming the feature
// supply-chain and passes the commitlint config; every PR title is the same
// text as its commit message and passes the Pull-request check on a
// renovate/* branch; the base settings stay as the PRD fixes them; the Node
// rule covers both .nvmrc (the nvm manager) and engines.node (the npm
// manager's engines); lockfile maintenance is enabled; the vulnerability-alert
// title carries no suffix. The rule finds every message and title wherever
// the config holds them, so a group added later is checked without changing
// this test.

type CommitConfig = Awaited<ReturnType<typeof loadCommitConfig>>;
type Config = Record<string, unknown>;

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const RENOVATE_JSON = join(ROOT, 'renovate.json');

const PRESETS = [
  'config:recommended',
  'helpers:pinGitHubActionDigests',
  ':disableDependencyDashboard',
];

const NPM_MESSAGE = 'chore: [supply-chain] update npm dependencies';
const ACTIONS_MESSAGE = 'chore: [supply-chain] update github actions';
const NODE_MESSAGE = 'chore: [supply-chain] update node';
const LOCKFILE_MESSAGE = 'chore: [supply-chain] refresh the lockfile';
const VULNERABILITY_MESSAGE =
  'chore: [supply-chain] fix vulnerable dependencies';

function group(message: string, title: string = message): Config {
  return {
    matchManagers: ['npm'],
    groupName: 'sample group',
    commitMessage: message,
    prTitle: title,
  };
}

// The Node group: the dependency node in both the nvm manager (.nvmrc) and
// the npm manager's engines (engines.node), unless the changes narrow it.
function nodeRule(changes: Config = {}): Config {
  return {
    matchManagers: ['nvm', 'npm'],
    matchDepNames: ['node'],
    groupName: 'node',
    commitMessage: NODE_MESSAGE,
    prTitle: NODE_MESSAGE,
    ...changes,
  };
}

// An invented config with the base settings, an npm group, the Node group,
// lockfile maintenance and vulnerability alerts, whose commit messages and PR
// titles pass every rule.
function sampleConfig(changes: Config = {}): Config {
  return {
    $schema: 'https://docs.renovatebot.com/renovate-schema.json',
    extends: [...PRESETS],
    semanticCommits: 'disabled',
    minimumReleaseAge: '14 days',
    schedule: ['before 6am on monday'],
    timezone: 'Europe/Berlin',
    packageRules: [group(NPM_MESSAGE), nodeRule()],
    lockFileMaintenance: {
      enabled: true,
      commitMessage: LOCKFILE_MESSAGE,
      prTitle: LOCKFILE_MESSAGE,
    },
    vulnerabilityAlerts: {
      commitMessage: VULNERABILITY_MESSAGE,
      prTitle: VULNERABILITY_MESSAGE,
      commitMessageSuffix: '',
    },
    ...changes,
  };
}

// The sample config without the named setting.
function sampleConfigWithout(setting: string): Config {
  const config = sampleConfig();
  Reflect.deleteProperty(config, setting);
  return config;
}

// Every string a config holds under the given key, at any depth.
function collectStrings(value: unknown, key: string): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item, key));
  }
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([name, inner]) =>
    name === key && typeof inner === 'string'
      ? [inner]
      : collectStrings(inner, key),
  );
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

  it('passes a config with several groups of fixed messages', async () => {
    const config = sampleConfig({
      packageRules: [group(NPM_MESSAGE), group(ACTIONS_MESSAGE), nodeRule()],
    });

    expect(await check(config)).toEqual([]);
  });

  describe('the commit messages', () => {
    it.each([
      ['a templated message', 'chore: [supply-chain] update {{depname}}'],
      [
        'a templated message in its description',
        'chore: [supply-chain] update {{manager}} dependencies',
      ],
    ])('fails %s', async (_case, message) => {
      expect(
        await check(
          sampleConfig({ packageRules: [group(message), nodeRule()] }),
        ),
      ).not.toEqual([]);
    });

    it.each([
      'chore: [quality-gates] update npm dependencies',
      'chore: [csv-import] update npm dependencies',
    ])('fails %s, which names another feature', async (message) => {
      expect(
        await check(
          sampleConfig({ packageRules: [group(message), nodeRule()] }),
        ),
      ).not.toEqual([]);
    });

    it.each([
      'chore: update npm dependencies',
      'chore: [supply-chain] Update npm dependencies',
      'chore: [supply-chain] update npm dependencies.',
      `chore: [supply-chain] update ${'a'.repeat(44)}`,
      'chore: [supply-chain] update dependency @types/node',
      'chore: [supply-chain] update npm dependencies, closes #12',
      'chore(deps): update npm dependencies',
      'deps: [supply-chain] update npm dependencies',
    ])('fails %s, which the commitlint config rejects', async (message) => {
      expect(
        await check(
          sampleConfig({ packageRules: [group(message), nodeRule()] }),
        ),
      ).not.toEqual([]);
    });

    it('fails a templated message outside packageRules', async () => {
      const config = sampleConfig({
        lockFileMaintenance: {
          enabled: true,
          commitMessage: 'chore: [supply-chain] update {{manager}} lockfile',
          prTitle: 'chore: [supply-chain] update {{manager}} lockfile',
        },
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails a message the commitlint config rejects in a later group', async () => {
      const message = 'chore: [supply-chain] Update github actions';
      const config = sampleConfig({
        packageRules: [group(NPM_MESSAGE), group(message), nodeRule()],
      });

      expect(await check(config)).not.toEqual([]);
    });
  });

  describe('the PR titles', () => {
    it.each([
      // Pass the commitlint config, fail the Pull-request check.
      'chore: [supply-chain] 01 update npm dependencies',
      'feat: [supply-chain] update npm dependencies',
      'ci: [supply-chain] update github actions',
    ])('fails %s, which the Pull-request check rejects', async (message) => {
      expect(
        await check(
          sampleConfig({ packageRules: [group(message), nodeRule()] }),
        ),
      ).not.toEqual([]);
    });

    it('fails a title that differs from its commit message', async () => {
      const config = sampleConfig({
        packageRules: [
          group(NPM_MESSAGE, 'chore: [supply-chain] update npm packages'),
          nodeRule(),
        ],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails a group with a commit message and no title', async () => {
      const config = sampleConfig({
        packageRules: [
          { matchManagers: ['npm'], commitMessage: NPM_MESSAGE },
          nodeRule(),
        ],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails a group with a title and no commit message', async () => {
      const config = sampleConfig({
        packageRules: [
          { matchManagers: ['npm'], prTitle: NPM_MESSAGE },
          nodeRule(),
        ],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails a templated title outside packageRules', async () => {
      const config = sampleConfig({
        vulnerabilityAlerts: {
          commitMessage: 'chore: [supply-chain] fix a vulnerable dependency',
          prTitle: 'chore: [supply-chain] fix {{depname}}',
        },
      });

      expect(await check(config)).not.toEqual([]);
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
    ])('fails a Node rule covering %s', async (_case, narrowing) => {
      const config = sampleConfig({
        packageRules: [group(NPM_MESSAGE), nodeRule(narrowing)],
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails lockfile maintenance disabled', async () => {
      const config = sampleConfig({
        lockFileMaintenance: {
          enabled: false,
          commitMessage: LOCKFILE_MESSAGE,
          prTitle: LOCKFILE_MESSAGE,
        },
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails lockfile maintenance left at its disabled default', async () => {
      const config = sampleConfig({
        lockFileMaintenance: {
          commitMessage: LOCKFILE_MESSAGE,
          prTitle: LOCKFILE_MESSAGE,
        },
      });

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
        vulnerabilityAlerts: {
          commitMessage: VULNERABILITY_MESSAGE,
          prTitle: VULNERABILITY_MESSAGE,
          commitMessageSuffix: '[SECURITY]',
        },
      });

      expect(await check(config)).not.toEqual([]);
    });

    it('fails a vulnerability-alert title with a suffix written into it', async () => {
      const message = `${VULNERABILITY_MESSAGE} [security]`;
      const config = sampleConfig({
        vulnerabilityAlerts: { commitMessage: message, prTitle: message },
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
          { ...group(NPM_MESSAGE), commitBody: 'sample body' },
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
        packageRules: [{ ...group(NPM_MESSAGE), automerge: true }, nodeRule()],
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

  function readConfig(): unknown {
    expect(existsSync(RENOVATE_JSON), 'renovate.json is missing').toBe(true);
    return JSON.parse(readFileSync(RENOVATE_JSON, 'utf8')) as unknown;
  }

  it('passes the Renovate rule', async () => {
    const config = readConfig();

    expect(await findRenovateViolations(config, commitConfig)).toEqual([]);
  });

  it.each([
    NPM_MESSAGE,
    ACTIONS_MESSAGE,
    NODE_MESSAGE,
    LOCKFILE_MESSAGE,
    VULNERABILITY_MESSAGE,
  ])('holds a group whose commit message is %s', (message) => {
    const config = readConfig();

    expect(collectStrings(config, 'commitMessage')).toContain(message);
    expect(collectStrings(config, 'prTitle')).toContain(message);
  });
});
