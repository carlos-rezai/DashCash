import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export type ExistingRuleset = { id: number; name: string };

export type RulesetRequest = {
  method: 'POST' | 'PUT' | 'PATCH';
  endpoint: string;
  body: unknown;
};

const REPOSITORY = 'repos/{owner}/{repo}';

// The requests that put the Ruleset on the repository: create it when no
// ruleset of its name exists, otherwise update that one by its id, and in
// both cases switch the repository to merge commits only.
export function planRulesetRequests(
  ruleset: { name: string },
  existing: readonly ExistingRuleset[],
): RulesetRequest[] {
  const current = existing.find(({ name }) => name === ruleset.name);
  const rulesetRequest: RulesetRequest =
    current === undefined
      ? { method: 'POST', endpoint: `${REPOSITORY}/rulesets`, body: ruleset }
      : {
          method: 'PUT',
          endpoint: `${REPOSITORY}/rulesets/${String(current.id)}`,
          body: ruleset,
        };
  return [
    rulesetRequest,
    {
      method: 'PATCH',
      endpoint: REPOSITORY,
      body: {
        allow_merge_commit: true,
        allow_squash_merge: false,
        allow_rebase_merge: false,
      },
    },
  ];
}

// Fills the {owner} and {repo} placeholders of an endpoint from the
// repository's `owner/name`.
export function resolveEndpoint(
  endpoint: string,
  nameWithOwner: string,
): string {
  const [owner = '', name = ''] = nameWithOwner.split('/');
  return endpoint.replace('{owner}', owner).replace('{repo}', name);
}

function gh(args: readonly string[], input?: string): string {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    input,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
}

// Run by the human, with a gh login that has admin rights on the repository.
if (import.meta.main) {
  try {
    const repository = gh([
      'repo',
      'view',
      '--json',
      'nameWithOwner',
      '--jq',
      '.nameWithOwner',
    ]).trim();
    const ruleset = JSON.parse(
      readFileSync('.github/rulesets/main.json', 'utf8'),
    ) as { name: string };
    const existing = JSON.parse(
      gh(['api', resolveEndpoint(`${REPOSITORY}/rulesets`, repository)]),
    ) as ExistingRuleset[];
    for (const request of planRulesetRequests(ruleset, existing)) {
      const endpoint = resolveEndpoint(request.endpoint, repository);
      gh(
        ['api', '--method', request.method, endpoint, '--input', '-'],
        JSON.stringify(request.body),
      );
      process.stdout.write(`${request.method} ${endpoint}\n`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
