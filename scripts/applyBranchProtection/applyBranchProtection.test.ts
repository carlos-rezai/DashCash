import { describe, expect, it } from 'vitest';
import { planRulesetRequests } from './applyBranchProtection.ts';

// The requests that put the Ruleset on the repository: create it when no
// ruleset of its name exists, otherwise update that one by its id, and in
// both cases switch the repository to merge commits only. Endpoints carry
// gh api's {owner} and {repo} placeholders.

const RULESET = {
  name: 'main',
  target: 'branch',
  enforcement: 'active',
  bypass_actors: [],
  conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
  rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }],
};

const REPOSITORY_PATCH = {
  method: 'PATCH',
  endpoint: 'repos/{owner}/{repo}',
  body: expect.objectContaining({
    allow_merge_commit: true,
    allow_squash_merge: false,
    allow_rebase_merge: false,
  }) as unknown,
};

const CREATE = {
  method: 'POST',
  endpoint: 'repos/{owner}/{repo}/rulesets',
  body: RULESET,
};

describe('planRulesetRequests', () => {
  it('plans a create when the repository has no rulesets', () => {
    const plan = planRulesetRequests(RULESET, []);

    expect(plan).toHaveLength(2);
    expect(plan).toContainEqual(CREATE);
  });

  it('plans a create when no ruleset carries its name', () => {
    const plan = planRulesetRequests(RULESET, [
      { id: 7, name: 'release' },
      { id: 9, name: 'main-old' },
    ]);

    expect(plan).toHaveLength(2);
    expect(plan).toContainEqual(CREATE);
  });

  it('plans an update by id when a ruleset of its name exists', () => {
    const plan = planRulesetRequests(RULESET, [
      { id: 7, name: 'release' },
      { id: 42, name: 'main' },
    ]);

    expect(plan).toHaveLength(2);
    expect(plan).toContainEqual({
      method: 'PUT',
      endpoint: 'repos/{owner}/{repo}/rulesets/42',
      body: RULESET,
    });
    expect(plan).not.toContainEqual(
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it.each([
    ['a create', []],
    ['an update', [{ id: 42, name: 'main' }]],
  ])(
    'patches the repository to merge commits only alongside %s',
    (_plan, existing) => {
      expect(planRulesetRequests(RULESET, existing)).toContainEqual(
        REPOSITORY_PATCH,
      );
    },
  );
});
