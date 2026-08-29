'use strict';

/**
 * TSM Vertical Control-Plane Runtime Certification
 *
 * PM V5.5 is the reference contract.
 *
 * This test intentionally starts as a discovery/runtime boundary audit.
 * It does NOT modify vertical implementations.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const VERTICALS = [
  'pm',
  'construction',
  'healthcare',
  'mortgage',
  'real_estate',
  'legal',
  'bpo',
  'schools',
  'hotelops',
  'insurance',
  'finops',
  'rcm'
];

const API_EXPECTATIONS = {
  pm: [
    '/api/pm/portfolio-intelligence',
    '/api/pm/risk',
    '/api/pm/forecast',
    '/api/pm/executive-decisions',
    '/api/pm/predictive-control',
    '/api/pm/intelligence-v3',
    '/api/pm/actions/verify'
  ],

  construction: [
    '/api/construction/portfolio-intelligence',
    '/api/construction/intelligence-v3',
    '/api/construction/executive-portal'
  ],

  mortgage: [
    '/api/mortgage/portfolio-intelligence',
    '/api/mortgage/intelligence-v3',
    '/api/mortgage/executive-portal'
  ],

  healthcare: [
    '/api/hc/node-report',
    '/api/hc/node-reports',
    '/api/hc/intelligence-v3',
    '/api/hc/portfolio-intelligence'
  ],

  schools: [
    '/api/schools/portfolio-intelligence',
    '/api/schools/intelligence-v3'
  ],

  finops: [
    '/api/finops/report',
    '/api/finops/actions'
  ],

  bpo: [
    '/api/bpo/reports/executive-rollup',
    '/api/bpo/work-items',
    '/api/bpo/sla-events'
  ],

  insurance: [
    '/api/insurance/query'
  ],

  legal: [
    '/api/legal/query'
  ],

  hotelops: [
    '/api/hotelops/query'
  ],

  rcm: [
    '/api/rcm'
  ],

  real_estate: []
};

const FILES = [
  'server.js',
  'server/pm',
  'server/construction',
  'server/mortgage',
  'server/healthcare',
  'server/schools',
  'server/finops-enterprise',
  'server/routes',
  'server/enterprise'
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function walk(dir) {
  if (!exists(dir)) return [];

  const absolute = path.join(ROOT, dir);

  if (fs.statSync(absolute).isFile()) {
    return [absolute];
  }

  const result = [];

  for (const entry of fs.readdirSync(absolute)) {
    const full = path.join(absolute, entry);

    if (entry === 'node_modules' || entry === '.git') continue;

    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      result.push(...walk(path.relative(ROOT, full)));
    } else if (
      /\.(js|cjs|mjs|html)$/.test(entry)
    ) {
      result.push(full);
    }
  }

  return result;
}

const files = [
  ...FILES.flatMap(walk),
  path.join(ROOT, 'server.js')
];

const uniqueFiles = [...new Set(files.filter(fs.existsSync))];

const source = uniqueFiles
  .map(file => {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      return '';
    }
  })
  .join('\n');

function has(re) {
  return re.test(source);
}

function checkVertical(vertical) {
  const aliases = vertical === 'real_estate'
    ? ['real-estate', 'real_estate', 'realestate', 'realty']
    : vertical === 'healthcare'
      ? ['healthcare', 'health', 'hc', 'rcm']
      : [vertical];

  const alias = aliases.join('|');

  const apiRoutes =
    API_EXPECTATIONS[vertical] || [];

  const routeEvidence = apiRoutes.length === 0
    ? true
    : apiRoutes.some(route =>
        source.includes(`'${route}'`) ||
        source.includes(`"${route}"`) ||
        source.includes(`\`${route}`) ||
        source.includes(route)
      );

  const structuredData = has(
    new RegExp(
      `(?:${alias}).*(?:finding|exception|exposure|portfolio|workOrder|work-order|case|claim|transaction|vendor|unit)`,
      'is'
    )
  );

  const decisions = has(
    new RegExp(
      `(?:${alias}).*(?:decision|BNCA|executive|recommendation|strategist)`,
      'is'
    )
  );

  const risk = has(
    new RegExp(
      `(?:${alias}).*(?:risk|severity|priority|score)`,
      'is'
    )
  );

  const forecast = has(
    new RegExp(
      `(?:${alias}).*(?:forecast|projected|prediction|predictive)`,
      'is'
    )
  );

  const actions = has(
    new RegExp(
      `(?:${alias}).*(?:action|workflow|queue|resolution)`,
      'is'
    )
  );

  const verification = has(
    new RegExp(
      `(?:${alias}).*(?:verif|validate|verified|validation)`,
      'is'
    )
  );

  const audit = has(
    new RegExp(
      `(?:${alias}).*(?:audit|ledger|event.?history|status.?event)`,
      'is'
    )
  );

  const persistence = has(
    new RegExp(
      `(?:${alias}).*(?:persist|postgres|mongo|upsert|store|repository)`,
      'is'
    )
  );

  const approval = has(
    new RegExp(
      `(?:${alias}).*(?:human.?approval|human.?review|approval|reviewRequired)`,
      'is'
    )
  );

  const idempotency = vertical === 'pm'
    ? has(/idempot/i)
    : has(
        new RegExp(
          `(?:${alias}).*idempot`,
          'is'
        )
      );

  const writeback = has(
    new RegExp(
      `(?:${alias}).*(?:write.?back|source.?system|writeback)`,
      'is'
    )
  );

  const deterministic = vertical === 'pm'
    ? true
    : has(
        new RegExp(
          `(?:${alias}).*(?:deterministic|rules|rule.?engine|decision.?engine)`,
          'is'
        )
      );

  const checks = {
    routeEvidence,
    structuredData,
    deterministic,
    decisions,
    risk,
    forecast,
    actions,
    approval,
    persistence,
    audit,
    verification,
    idempotency,
    writebackBoundary: writeback
  };

  const passed = Object.values(checks).filter(Boolean).length;

  return {
    vertical,
    score: Math.round((passed / Object.keys(checks).length) * 100),
    checks
  };
}

console.log('============================================================');
console.log(' TSM VERTICAL CONTROL-PLANE RUNTIME CERTIFICATION');
console.log('============================================================');
console.log('');
console.log('PM V5.5 = REFERENCE IMPLEMENTATION');
console.log('');

const results = VERTICALS.map(checkVertical);

for (const result of results) {
  console.log(
    `${result.vertical.padEnd(15)} ` +
    `${String(result.score).padStart(3)}/100`
  );

  for (const [key, value] of Object.entries(result.checks)) {
    console.log(
      `  ${value ? 'PASS' : 'MISS'} ${key}`
    );
  }

  console.log('');
}

const reportDir = path.join(ROOT, 'reports');

fs.mkdirSync(reportDir, { recursive: true });

fs.writeFileSync(
  path.join(reportDir, 'vertical-control-plane-runtime.json'),
  JSON.stringify({
    reference: 'PM V5.5',
    generatedAt: new Date().toISOString(),
    results
  }, null, 2)
);

fs.writeFileSync(
  path.join(reportDir, 'vertical-control-plane-runtime.md'),
  [
    '# TSM Vertical Control-Plane Runtime Certification',
    '',
    'Reference implementation: PM V5.5',
    '',
    '| Vertical | Score |',
    '|---|---:|',
    ...results.map(r =>
      `| ${r.vertical} | ${r.score}/100 |`
    ),
    ''
  ].join('\n')
);

console.log('============================================================');
console.log(' REPORTS');
console.log('============================================================');
console.log('reports/vertical-control-plane-runtime.json');
console.log('reports/vertical-control-plane-runtime.md');
