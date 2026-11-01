import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// .github/pull_request_template.md: the feature folder, one line per ticket,
// and the design log's assumptions under "## Assumptions".

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function readTemplateLines(): string[] {
  return readFileSync(join(ROOT, '.github/pull_request_template.md'), 'utf8')
    .split('\n')
    .map((line) => line.trimEnd());
}

describe('the pull-request template', () => {
  it('asks for the feature folder', () => {
    expect(
      readTemplateLines().some((line) => line.includes('docs/features/')),
    ).toBe(true);
  });

  it('asks for one list line per ticket before the assumptions', () => {
    const lines = readTemplateLines();
    const assumptions = lines.indexOf('## Assumptions');
    const ticketLine = lines.findIndex(
      (line) => line.startsWith('- ') && /ticket/i.test(line),
    );

    expect(ticketLine).toBeGreaterThanOrEqual(0);
    expect(ticketLine).toBeLessThan(assumptions);
  });

  it('has an Assumptions section', () => {
    expect(readTemplateLines()).toContain('## Assumptions');
  });
});
