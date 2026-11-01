// Layer rules across packages and processes, and the renderer's own Layer
// ladder.

// Tests, stories and test-support/ may reach for dev tooling such as vitest;
// everything else is Shipping code and keeps to its boundary.
const NOT_SHIPPING =
  '(\\.(test|spec|stories)\\.[cm]?[jt]sx?$|(^|/)test-support/|^e2e/)';

const ELECTRON = '(^|/)node_modules/electron(/|$)';

const RENDERER = '^apps/desktop/src/renderer';

// The Layer ladder, bottom to top: a Layer imports only from the Layers below
// it, and from its own.
const LADDER = [
  'tokens',
  'primitives',
  'components',
  'features',
  'layouts',
  'pages',
  'App',
];

// Folders beside the ladder: every Layer may import them; they import only
// each other, tokens/, the contract and the domain.
const SHARED = ['api', 'hooks', 'utils', 'types', 'assets', 'styles'];

/** @type {import('dependency-cruiser').IForbiddenRuleType[]} */
const ladderRules = LADDER.slice(0, -1).map((layer, index) => ({
  name: `renderer-${layer}-not-to-higher-layer`,
  comment: `${layer}/ imports only from its own Layer and the Layers below it.`,
  severity: 'error',
  from: { path: `${RENDERER}/${layer}/` },
  to: { path: `${RENDERER}/(${LADDER.slice(index + 1).join('|')})/` },
}));

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
    ...ladderRules,
    {
      name: 'renderer-shared-not-to-ladder',
      comment:
        'The shared folders import only each other, tokens/, the contract and the domain.',
      severity: 'error',
      from: { path: `${RENDERER}/(${SHARED.join('|')})/` },
      to: { path: `${RENDERER}/(${LADDER.slice(1).join('|')})/` },
    },
    {
      name: 'feature-module-only-through-index',
      comment:
        'A feature module under features/<x>/ is reachable from outside it only through features/<x>/index.ts.',
      severity: 'error',
      from: { path: `${RENDERER}/features/([^/]+)/` },
      to: { path: `${RENDERER}/features/(?!$1/)[^/]+/(?!index[.]ts$)` },
    },
    {
      name: 'feature-module-only-through-index-from-outside-features',
      comment:
        'Outside features/, a feature module is reached only through features/<x>/index.ts.',
      severity: 'error',
      from: { path: `${RENDERER}/`, pathNot: `${RENDERER}/features/` },
      to: { path: `${RENDERER}/features/[^/]+/(?!index[.]ts$)` },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)\\.gitkeep$' },
    tsPreCompilationDeps: true,
  },
};
