// Layer rules across packages and processes. The renderer's own layer ladder
// is added by the next ticket.

// Tests, stories and test-support/ may reach for dev tooling such as vitest;
// everything else is Shipping code and keeps to its boundary.
const NOT_SHIPPING =
  '(\\.(test|spec|stories)\\.[cm]?[jt]sx?$|(^|/)test-support/|^e2e/)';

const ELECTRON = '(^|/)node_modules/electron(/|$)';

/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'domain-imports-nothing-outside',
      comment:
        'packages/domain imports nothing outside itself: no other workspace, npm package or Node built-in.',
      severity: 'error',
      from: { path: '^packages/domain/', pathNot: NOT_SHIPPING },
      to: { pathNot: '^packages/domain/' },
    },
    {
      name: 'contract-imports-only-domain',
      comment: 'packages/contract imports only packages/domain.',
      severity: 'error',
      from: { path: '^packages/contract/', pathNot: NOT_SHIPPING },
      to: { pathNot: '^packages/(contract|domain)/' },
    },
    {
      name: 'renderer-not-to-node-or-electron',
      comment: 'The renderer is barred from Node built-ins and electron.',
      severity: 'error',
      from: { path: '^apps/desktop/src/renderer/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'renderer-not-to-electron',
      severity: 'error',
      from: { path: '^apps/desktop/src/renderer/' },
      to: { path: ELECTRON },
    },
    {
      name: 'renderer-not-to-main-or-preload',
      comment: 'The renderer reaches main only through packages/contract.',
      severity: 'error',
      from: { path: '^apps/desktop/src/renderer/' },
      to: { path: '^apps/desktop/src/(main|preload)/' },
    },
    {
      name: 'preload-imports-only-electron-and-contract',
      comment: 'The preload imports only electron and the contract.',
      severity: 'error',
      from: { path: '^apps/desktop/src/preload/', pathNot: NOT_SHIPPING },
      to: {
        pathNot: [
          ELECTRON,
          '^packages/contract/',
          '^apps/desktop/src/preload/',
        ],
      },
    },
    {
      name: 'test-support-only-for-tests',
      comment:
        'test-support/ is imported only by tests, stories, other test-support/ files and e2e/.',
      severity: 'error',
      from: { pathNot: NOT_SHIPPING },
      to: { path: '(^|/)test-support/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)\\.gitkeep$' },
    tsPreCompilationDeps: true,
  },
};
