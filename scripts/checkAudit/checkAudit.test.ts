import { describe, expect, it } from 'vitest';
import type { Violation } from '../reportViolations/reportViolations.ts';
import { checkAudit, findAuditViolations } from './checkAudit.ts';

const EXCEPTIONS_FILE = 'quality/audit-exceptions.json';
const NPM_AUDIT = 'npm audit';

// Invented GHSA ids and package names; nothing here is a real advisory.
const GHSA_GLOB = 'GHSA-2c3f-4g5h-6j7m';
const GHSA_PARSER = 'GHSA-7p8q-9r2v-3w4x';
const GHSA_TEMPLATE = 'GHSA-c2f3-g4h5-j6m7';
const GHSA_ARCHIVE = 'GHSA-m3p4-q5r6-v7w8';

const TODAY = '2026-11-02';

type Severity = 'low' | 'moderate' | 'high' | 'critical';

type AdvisorySpec = {
  id: string;
  title: string;
  severity: Severity;
};

// One advisory object as npm audit lists it in a vulnerability's `via`.
function advisory({ id, title, severity }: AdvisorySpec): unknown {
  return {
    source: 1_100_000 + id.length,
    name: 'sample-package',
    dependency: 'sample-package',
    title,
    url: `https://github.com/advisories/${id}`,
    severity,
    cwe: ['CWE-1333'],
    cvss: { score: 5.3, vectorString: null },
    range: '<1.2.3',
  };
}

// One vulnerability of a version-2 report; `via` holds advisory objects and
// the names of other vulnerable packages.
function vulnerability(
  name: string,
  severity: Severity,
  via: readonly unknown[],
): unknown {
  return {
    name,
    severity,
    isDirect: false,
    via,
    effects: [],
    range: '<1.2.3',
    nodes: [`node_modules/${name}`],
    fixAvailable: false,
  };
}

// A version-2 `npm audit --json` report with the given vulnerabilities, in
// the order given.
function report(vulnerabilities: Record<string, unknown> = {}): unknown {
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
        total: Object.keys(vulnerabilities).length,
      },
      dependencies: {
        prod: 3,
        dev: 412,
        optional: 0,
        peer: 0,
        peerOptional: 0,
        total: 414,
      },
    },
  };
}

const GLOB_ADVISORY: AdvisorySpec = {
  id: GHSA_GLOB,
  title: 'Sample Glob Walker has a regular expression denial of service',
  severity: 'moderate',
};

// A report with the one moderate glob advisory in glob-walker.
function globReport(): unknown {
  return report({
    'glob-walker': vulnerability('glob-walker', 'moderate', [
      advisory(GLOB_ADVISORY),
    ]),
  });
}

type ExceptionSpec = {
  advisory?: unknown;
  reason?: unknown;
  added?: unknown;
  expires?: unknown;
};

// A well-formed audit exception; each field can be replaced or, set to
// undefined, left out.
function exception(spec: ExceptionSpec = {}): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    advisory: GHSA_GLOB,
    reason: 'reached only through the sample lint tooling on our own globs',
    added: '2026-10-01',
    expires: '2026-12-30',
    ...spec,
  };
  return Object.fromEntries(
    Object.entries(entry).filter(([, value]) => value !== undefined),
  );
}

function unexcepted(
  { id, title, severity }: AdvisorySpec,
  packages: string,
): Violation {
  return {
    subject: id,
    reason: `${severity} advisory "${title}" in ${packages} has no audit exception`,
  };
}

function expired(id: string, date: string): Violation {
  return { subject: id, reason: `audit exception expired on ${date}` };
}

// A violation on the exceptions file whose reason names the entry's index and
// the field, in whatever words.
function malformed(index: number, field: string): Violation {
  return {
    subject: EXCEPTIONS_FILE,
    reason: expect.stringMatching(
      new RegExp(
        `^(?=.*(^|\\D)${String(index)}(\\D|$))(?=.*\\b${field}\\b)`,
        's',
      ),
    ) as string,
  };
}

function onExceptionsFile(violations: readonly Violation[]): Violation[] {
  return violations.filter(({ subject }) => subject === EXCEPTIONS_FILE);
}

function stale(id: string): Violation {
  return {
    subject: id,
    reason: 'audit exception names an advisory npm audit no longer reports',
  };
}

// One violation on the exceptions file whose reason names the duplicate id.
function duplicate(id: string): Violation {
  return {
    subject: EXCEPTIONS_FILE,
    reason: expect.stringContaining(id) as string,
  };
}

// An advisory object like `advisory`, with its `url` replaced or, set to
// undefined, left out.
function advisoryAt(spec: AdvisorySpec, url: unknown): unknown {
  const entry = { ...(advisory(spec) as Record<string, unknown>), url };
  return Object.fromEntries(
    Object.entries(entry).filter(([, value]) => value !== undefined),
  );
}

const NO_ID_ADVISORY: AdvisorySpec = {
  id: 'none',
  title: 'Sample Query Builder allows injection through raw fragments',
  severity: 'high',
};

// A report whose one advisory, in query-builder, has the given `url`.
function noIdReport(url: unknown): unknown {
  return report({
    'query-builder': vulnerability('query-builder', 'high', [
      advisoryAt(NO_ID_ADVISORY, url),
    ]),
  });
}

function lineOf({ subject, reason }: Violation): string {
  return `${subject}: ${reason}`;
}

// The violations whose line names the advisory without a GHSA id.
function aboutNoIdAdvisory(violations: readonly Violation[]): Violation[] {
  return violations.filter((violation) =>
    lineOf(violation).includes(NO_ID_ADVISORY.title),
  );
}

// Asserts that `violations` hold exactly one violation for the advisory
// without a GHSA id, and that it is a violation of its own rather than the
// advisory reported as lacking an audit exception.
function expectOwnNoIdViolation(violations: readonly Violation[]): void {
  const own = aboutNoIdAdvisory(violations);
  expect(own).toHaveLength(1);
  expect(lineOf(own[0] as Violation)).not.toMatch(/has no audit exception/);
}

describe('findAuditViolations', () => {
  describe('advisories', () => {
    it('reports nothing for a report without advisories', () => {
      expect(findAuditViolations(report(), [], TODAY)).toEqual([]);
    });

    it('reports an advisory without an audit exception, with its severity, title and package', () => {
      expect(findAuditViolations(globReport(), [], TODAY)).toEqual([
        unexcepted(GLOB_ADVISORY, 'glob-walker'),
      ]);
    });

    it('reports nothing for an advisory with a valid audit exception', () => {
      expect(findAuditViolations(globReport(), [exception()], TODAY)).toEqual(
        [],
      );
    });

    it('does not lift an advisory with an exception for another advisory', () => {
      expect(
        findAuditViolations(
          globReport(),
          [exception({ advisory: GHSA_PARSER })],
          TODAY,
        ),
      ).toContainEqual(unexcepted(GLOB_ADVISORY, 'glob-walker'));
    });

    it('carries no advisory in a string entry of via', () => {
      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
          ]),
          'lint-runner': vulnerability('lint-runner', 'moderate', [
            'glob-walker',
          ]),
        }),
        [],
        TODAY,
      );

      expect(violations).toEqual([unexcepted(GLOB_ADVISORY, 'glob-walker')]);
    });

    it('reports advisories of every severity, dev dependencies included', () => {
      const low: AdvisorySpec = {
        id: GHSA_PARSER,
        title: 'Sample Parser leaks memory on deep input',
        severity: 'low',
      };
      const high: AdvisorySpec = {
        id: GHSA_TEMPLATE,
        title: 'Sample Template allows prototype pollution',
        severity: 'high',
      };
      const critical: AdvisorySpec = {
        id: GHSA_ARCHIVE,
        title: 'Sample Archive writes outside the target folder',
        severity: 'critical',
      };

      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
          ]),
          'deep-parser': vulnerability('deep-parser', 'low', [advisory(low)]),
          'tiny-template': vulnerability('tiny-template', 'high', [
            advisory(high),
          ]),
          'pack-archive': vulnerability('pack-archive', 'critical', [
            advisory(critical),
          ]),
        }),
        [],
        TODAY,
      );

      expect(violations).toHaveLength(4);
      expect(violations).toEqual(
        expect.arrayContaining([
          unexcepted(GLOB_ADVISORY, 'glob-walker'),
          unexcepted(low, 'deep-parser'),
          unexcepted(high, 'tiny-template'),
          unexcepted(critical, 'pack-archive'),
        ]),
      );
    });

    it('reports one advisory reaching several packages once, with every package', () => {
      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
          ]),
          'glob-walker-legacy': vulnerability(
            'glob-walker-legacy',
            'moderate',
            [advisory(GLOB_ADVISORY)],
          ),
          'lint-runner': vulnerability('lint-runner', 'moderate', [
            'glob-walker',
          ]),
        }),
        [],
        TODAY,
      );

      expect(violations).toEqual([
        unexcepted(GLOB_ADVISORY, 'glob-walker, glob-walker-legacy'),
      ]);
    });

    it('reports an advisory listed twice in one via once, with its package once', () => {
      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
            advisory(GLOB_ADVISORY),
          ]),
        }),
        [],
        TODAY,
      );

      expect(violations).toEqual([unexcepted(GLOB_ADVISORY, 'glob-walker')]);
    });

    it('lifts an advisory reaching several packages with one exception', () => {
      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
          ]),
          'glob-walker-legacy': vulnerability(
            'glob-walker-legacy',
            'moderate',
            [advisory(GLOB_ADVISORY)],
          ),
        }),
        [exception()],
        TODAY,
      );

      expect(violations).toEqual([]);
    });
  });

  describe('the expiry date', () => {
    it('accepts an exception on its expiry date', () => {
      expect(
        findAuditViolations(
          globReport(),
          [exception({ added: '2026-10-01', expires: '2026-11-30' })],
          '2026-11-30',
        ),
      ).toEqual([]);
    });

    it('reports an exception the day after its expiry date, naming the date', () => {
      expect(
        findAuditViolations(
          globReport(),
          [exception({ added: '2026-10-01', expires: '2026-11-30' })],
          '2026-12-01',
        ),
      ).toEqual([expired(GHSA_GLOB, '2026-11-30')]);
    });

    it('reports an expired exception across a year end', () => {
      expect(
        findAuditViolations(
          globReport(),
          [exception({ added: '2026-12-01', expires: '2026-12-31' })],
          '2027-01-01',
        ),
      ).toEqual([expired(GHSA_GLOB, '2026-12-31')]);
    });
  });

  describe('the 90-day limit', () => {
    it('accepts an exception expiring exactly 90 days after it was added', () => {
      expect(
        findAuditViolations(
          globReport(),
          [exception({ added: '2026-10-01', expires: '2026-12-30' })],
          TODAY,
        ),
      ).toEqual([]);
    });

    it('accepts 90 days across a year end and a leap day', () => {
      expect(
        findAuditViolations(
          globReport(),
          [exception({ added: '2027-12-15', expires: '2028-03-14' })],
          '2027-12-20',
        ),
      ).toEqual([]);
    });

    it('reports an exception expiring 91 days after it was added', () => {
      const violations = findAuditViolations(
        globReport(),
        [
          exception(),
          exception({
            advisory: GHSA_PARSER,
            added: '2026-10-01',
            expires: '2026-12-31',
          }),
        ],
        TODAY,
      );

      expect(onExceptionsFile(violations)).toEqual([malformed(1, 'expires')]);
    });

    it('reports an exception expiring before it was added', () => {
      const violations = findAuditViolations(
        globReport(),
        [
          exception(),
          exception({
            advisory: GHSA_PARSER,
            added: '2026-11-01',
            expires: '2026-10-31',
          }),
        ],
        TODAY,
      );

      expect(onExceptionsFile(violations)).toEqual([malformed(1, 'expires')]);
    });

    it('reports an exception added later than today', () => {
      const violations = findAuditViolations(
        globReport(),
        [
          exception(),
          exception({
            advisory: GHSA_PARSER,
            added: '2026-11-10',
            expires: '2026-12-01',
          }),
        ],
        TODAY,
      );

      expect(onExceptionsFile(violations)).toEqual([malformed(1, 'added')]);
    });

    it('accepts an exception added today', () => {
      expect(
        findAuditViolations(
          globReport(),
          [exception({ added: TODAY, expires: '2027-01-31' })],
          TODAY,
        ),
      ).toEqual([]);
    });
  });

  describe('a malformed exceptions file', () => {
    it.each([
      ['an object', { advisory: GHSA_GLOB }],
      ['null', null],
      ['a string', 'GHSA-2c3f-4g5h-6j7m'],
    ])(
      'reports exceptions that are %s, not an array, naming the file',
      (_, exceptions) => {
        expect(findAuditViolations(report(), exceptions, TODAY)).toEqual([
          { subject: EXCEPTIONS_FILE, reason: expect.any(String) as string },
        ]);
      },
    );

    it.each<[string, ExceptionSpec, string]>([
      ['a missing reason', { reason: undefined }, 'reason'],
      ['an empty reason', { reason: '' }, 'reason'],
      ['a reason that is not a string', { reason: 42 }, 'reason'],
      ['a CVE id as advisory', { advisory: 'CVE-2026-12345' }, 'advisory'],
      ['a short GHSA id', { advisory: 'GHSA-2c3f-4g5h' }, 'advisory'],
      ['a missing advisory', { advisory: undefined }, 'advisory'],
      ['a missing added date', { added: undefined }, 'added'],
      [
        'an added date that is not YYYY-MM-DD',
        { added: '2026/10/01' },
        'added',
      ],
      ['an added date without padding', { added: '2026-10-1' }, 'added'],
      ['an added date that is no real date', { added: '2026-02-30' }, 'added'],
      ['a missing expiry date', { expires: undefined }, 'expires'],
      [
        'an expiry date that is not YYYY-MM-DD',
        { expires: '30.12.2026' },
        'expires',
      ],
      [
        'an expiry date that is no real date',
        { expires: '2027-02-30' },
        'expires',
      ],
      ['an expiry date in month 13', { expires: '2026-13-01' }, 'expires'],
    ])(
      'reports %s as one violation naming the entry and the field',
      (_, spec, field) => {
        const violations = findAuditViolations(
          globReport(),
          [exception(), exception({ advisory: GHSA_PARSER, ...spec })],
          TODAY,
        );

        expect(onExceptionsFile(violations)).toEqual([malformed(1, field)]);
      },
    );

    it('reports an entry that is not an object as one violation naming the entry', () => {
      const violations = findAuditViolations(
        globReport(),
        [exception(), null],
        TODAY,
      );

      expect(onExceptionsFile(violations)).toEqual([malformed(1, 'entry')]);
    });

    it('ignores keys it does not know', () => {
      expect(
        findAuditViolations(
          globReport(),
          [{ ...exception(), owner: 'sample-team', ticket: 'none' }],
          TODAY,
        ),
      ).toEqual([]);
    });
  });

  describe('an unreadable report', () => {
    it('reports a report without vulnerabilities as npm audit', () => {
      expect(
        findAuditViolations({ auditReportVersion: 2, metadata: {} }, [], TODAY),
      ).toEqual([{ subject: NPM_AUDIT, reason: expect.any(String) as string }]);
    });

    it('reports a report with an error as npm audit', () => {
      expect(
        findAuditViolations(
          {
            auditReportVersion: 2,
            vulnerabilities: {},
            error: {
              code: 'ENOTFOUND',
              summary: 'request to the sample registry failed',
              detail: '',
            },
          },
          [],
          TODAY,
        ),
      ).toEqual([{ subject: NPM_AUDIT, reason: expect.any(String) as string }]);
    });

    it('reports a report that is not an object as npm audit', () => {
      expect(findAuditViolations('no report', [], TODAY)).toEqual([
        { subject: NPM_AUDIT, reason: expect.any(String) as string },
      ]);
    });
  });

  describe('a stale exception', () => {
    it('reports an exception whose advisory the report does not list', () => {
      expect(findAuditViolations(report(), [exception()], TODAY)).toEqual([
        stale(GHSA_GLOB),
      ]);
    });

    it('reports the stale exception only, beside a live one', () => {
      expect(
        findAuditViolations(
          globReport(),
          [exception(), exception({ advisory: GHSA_PARSER })],
          TODAY,
        ),
      ).toEqual([stale(GHSA_PARSER)]);
    });

    it('reports an exception both expired and stale once, as expired, beside a stale one', () => {
      const violations = findAuditViolations(
        report(),
        [
          exception({ added: '2026-10-01', expires: '2026-11-30' }),
          exception({
            advisory: GHSA_PARSER,
            added: '2026-11-15',
            expires: '2027-01-31',
          }),
        ],
        '2026-12-01',
      );

      expect(violations).toHaveLength(2);
      expect(violations).toEqual(
        expect.arrayContaining([
          expired(GHSA_GLOB, '2026-11-30'),
          stale(GHSA_PARSER),
        ]),
      );
    });
  });

  describe('two exceptions for one advisory', () => {
    it('reports one violation on the exceptions file, naming the duplicate id', () => {
      expect(
        findAuditViolations(
          globReport(),
          [
            exception(),
            exception({
              reason: 'a second entry for the same sample advisory',
              added: '2026-10-15',
              expires: '2027-01-10',
            }),
          ],
          TODAY,
        ),
      ).toEqual([duplicate(GHSA_GLOB)]);
    });

    it('reports only the duplicated advisory, beside an exception for another', () => {
      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
          ]),
          'deep-parser': vulnerability('deep-parser', 'low', [
            advisory({
              id: GHSA_PARSER,
              title: 'Sample Parser leaks memory on deep input',
              severity: 'low',
            }),
          ]),
        }),
        [
          exception({ advisory: GHSA_PARSER }),
          exception(),
          exception({ reason: 'a second entry for the same sample advisory' }),
        ],
        TODAY,
      );

      expect(violations).toEqual([duplicate(GHSA_GLOB)]);
      expect(lineOf(violations[0] as Violation)).not.toContain(GHSA_PARSER);
    });

    describe('when one of them is expired or stale', () => {
      const EXPIRED = exception({ added: '2026-09-01', expires: '2026-10-01' });
      const LIVE = exception();
      const OTHER_LIVE = exception({
        reason: 'a second entry for the same sample advisory',
      });

      it.each<[string, () => unknown, unknown[], Violation[]]>([
        [
          'one expired and one live, the advisory listed',
          globReport,
          [EXPIRED, LIVE],
          [expired(GHSA_GLOB, '2026-10-01'), duplicate(GHSA_GLOB)],
        ],
        [
          'one expired and one live, the advisory not listed',
          report,
          [EXPIRED, LIVE],
          [
            expired(GHSA_GLOB, '2026-10-01'),
            stale(GHSA_GLOB),
            duplicate(GHSA_GLOB),
          ],
        ],
        [
          'both live, the advisory not listed',
          report,
          [LIVE, OTHER_LIVE],
          [stale(GHSA_GLOB), stale(GHSA_GLOB), duplicate(GHSA_GLOB)],
        ],
        [
          'both expired, the advisory listed',
          globReport,
          [EXPIRED, exception({ added: '2026-09-15', expires: '2026-10-15' })],
          [
            expired(GHSA_GLOB, '2026-10-01'),
            expired(GHSA_GLOB, '2026-10-15'),
            duplicate(GHSA_GLOB),
          ],
        ],
      ])(
        'reports each exception once, in either order: %s',
        (_, makeReport, entries, expected) => {
          for (const ordered of [entries, [...entries].reverse()]) {
            const violations = findAuditViolations(
              makeReport(),
              ordered,
              TODAY,
            );

            expect(violations).toHaveLength(expected.length);
            expect(violations).toEqual(expect.arrayContaining(expected));
          }
        },
      );
    });
  });

  describe('an advisory without a GHSA id', () => {
    it.each<[string, unknown]>([
      [
        'a url ending in a number',
        'https://registry.invented.test/-/npm/v1/security/advisories/1100042',
      ],
      [
        'a url ending in a CVE id',
        'https://github.com/advisories/CVE-2026-12345',
      ],
      [
        'a url with a path after the GHSA id',
        `https://github.com/advisories/${GHSA_GLOB}/dependabot`,
      ],
      [
        'a url ending in a short GHSA id',
        'https://github.com/advisories/GHSA-2c3f-4g5h',
      ],
      ['no url', undefined],
      ['a url that is not a string', 1_100_042],
    ])('reports an advisory with %s as a violation of its own', (_, url) => {
      const violations = findAuditViolations(noIdReport(url), [], TODAY);

      expect(violations).toHaveLength(1);
      expectOwnNoIdViolation(violations);
    });

    it('is not lifted by an exception for the GHSA id inside its url', () => {
      const violations = findAuditViolations(
        noIdReport(`https://github.com/advisories/${GHSA_GLOB}/dependabot`),
        [exception()],
        TODAY,
      );

      expectOwnNoIdViolation(violations);
    });

    it('is reported beside the advisories that have a GHSA id', () => {
      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
          ]),
          'query-builder': vulnerability('query-builder', 'high', [
            advisoryAt(
              NO_ID_ADVISORY,
              'https://registry.invented.test/-/npm/v1/security/advisories/1100042',
            ),
          ]),
        }),
        [exception()],
        TODAY,
      );

      expect(violations).toHaveLength(1);
      expectOwnNoIdViolation(violations);
    });
  });

  describe('violation lines', () => {
    it('keeps the stale, duplicate and no-GHSA-id violations to one line each', () => {
      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
          ]),
          'query-builder': vulnerability('query-builder', 'high', [
            advisoryAt(
              NO_ID_ADVISORY,
              'https://registry.invented.test/-/npm/v1/security/advisories/1100042',
            ),
          ]),
        }),
        [
          exception(),
          exception({ reason: 'a second entry for the same sample advisory' }),
          exception({ advisory: GHSA_TEMPLATE }),
        ],
        TODAY,
      );

      expect(violations).toContainEqual(stale(GHSA_TEMPLATE));
      expect(violations).toContainEqual(duplicate(GHSA_GLOB));
      expectOwnNoIdViolation(violations);
      for (const violation of violations) {
        expect(lineOf(violation)).not.toMatch(/[\r\n]/);
      }
    });

    it('keeps every violation to one line', () => {
      const violations = findAuditViolations(
        report({
          'glob-walker': vulnerability('glob-walker', 'moderate', [
            advisory(GLOB_ADVISORY),
          ]),
          'glob-walker-legacy': vulnerability(
            'glob-walker-legacy',
            'moderate',
            [advisory(GLOB_ADVISORY)],
          ),
        }),
        [
          exception({ advisory: GHSA_PARSER, reason: '' }),
          exception({ advisory: GHSA_TEMPLATE, expires: '2027-02-30' }),
        ],
        TODAY,
      );

      expect(violations.length).toBeGreaterThan(0);
      for (const { subject, reason } of violations) {
        expect(`${subject}: ${reason}`).not.toMatch(/[\r\n]/);
      }
    });
  });
});

describe('checkAudit', () => {
  const NPM_CLI = '/invented/npm/bin/npm-cli.js';
  const STARTED_BY_NPM = { npm_execpath: NPM_CLI };

  type NodeCall = readonly string[];

  // A stand-in for running node: records every call and answers with the
  // given exit code and output. Nothing is spawned and nothing goes online.
  function fakeNode(status: number | null, stdout: string) {
    const calls: NodeCall[] = [];
    return {
      calls,
      runNode: (args: readonly string[]) => {
        calls.push([...args]);
        return { status, stdout };
      },
    };
  }

  // Reads the given files by path; any other path fails as a missing file.
  function files(contents: Record<string, string>) {
    return (path: string): string => {
      const content = contents[path];
      if (content === undefined) {
        throw Object.assign(new Error(`ENOENT: no such file, open '${path}'`), {
          code: 'ENOENT',
        });
      }
      return content;
    };
  }

  const EXCEPTIONS_JSON = JSON.stringify([exception()]);

  it('runs npm audit --json through the npm that started it and judges the report', () => {
    const node = fakeNode(1, JSON.stringify(globReport()));

    const violations = checkAudit({
      env: STARTED_BY_NPM,
      today: TODAY,
      runNode: node.runNode,
      readFile: files({ [EXCEPTIONS_FILE]: EXCEPTIONS_JSON }),
    });

    expect(node.calls).toEqual([[NPM_CLI, 'audit', '--json']]);
    expect(violations).toEqual([]);
  });

  it('reports the advisories of a report npm audit ends with exit code 1', () => {
    const node = fakeNode(1, JSON.stringify(globReport()));

    expect(
      checkAudit({
        env: STARTED_BY_NPM,
        today: TODAY,
        runNode: node.runNode,
        readFile: files({ [EXCEPTIONS_FILE]: '[]' }),
      }),
    ).toEqual([unexcepted(GLOB_ADVISORY, 'glob-walker')]);
  });

  it('accepts a report npm audit ends with exit code 0', () => {
    const node = fakeNode(0, JSON.stringify(report()));

    expect(
      checkAudit({
        env: STARTED_BY_NPM,
        today: TODAY,
        runNode: node.runNode,
        readFile: files({ [EXCEPTIONS_FILE]: '[]' }),
      }),
    ).toEqual([]);
  });

  it('fails with a message to run npm run check:audit when npm did not start it', () => {
    const node = fakeNode(0, JSON.stringify(report()));

    expect(() =>
      checkAudit({
        env: {},
        today: TODAY,
        runNode: node.runNode,
        readFile: files({ [EXCEPTIONS_FILE]: '[]' }),
      }),
    ).toThrow(/npm run check:audit/);
    expect(node.calls).toEqual([]);
  });

  it.each([
    ['text', 'npm error code ENOTFOUND'],
    ['nothing', ''],
  ])(
    'fails with a message to run npm run check:audit when npm audit prints %s instead of JSON',
    (_, stdout) => {
      const node = fakeNode(1, stdout);

      expect(() =>
        checkAudit({
          env: STARTED_BY_NPM,
          today: TODAY,
          runNode: node.runNode,
          readFile: files({ [EXCEPTIONS_FILE]: '[]' }),
        }),
      ).toThrow(/npm run check:audit/);
    },
  );

  it.each([
    ['exit code 2', 2],
    ['no exit code', null],
  ])(
    'fails with a message to run npm run check:audit when npm audit ends with %s, even with a JSON report',
    (_, status) => {
      const node = fakeNode(status, JSON.stringify(report()));

      expect(() =>
        checkAudit({
          env: STARTED_BY_NPM,
          today: TODAY,
          runNode: node.runNode,
          readFile: files({ [EXCEPTIONS_FILE]: '[]' }),
        }),
      ).toThrow(/npm run check:audit/);
    },
  );

  it('reports a missing exceptions file, naming it', () => {
    const node = fakeNode(0, JSON.stringify(report()));

    expect(
      checkAudit({
        env: STARTED_BY_NPM,
        today: TODAY,
        runNode: node.runNode,
        readFile: files({}),
      }),
    ).toEqual([
      { subject: EXCEPTIONS_FILE, reason: expect.any(String) as string },
    ]);
  });

  it('reports an unparsable exceptions file, naming it', () => {
    const node = fakeNode(0, JSON.stringify(report()));

    expect(
      checkAudit({
        env: STARTED_BY_NPM,
        today: TODAY,
        runNode: node.runNode,
        readFile: files({ [EXCEPTIONS_FILE]: '[{ "advisory": ' }),
      }),
    ).toEqual([
      { subject: EXCEPTIONS_FILE, reason: expect.any(String) as string },
    ]);
  });
});
