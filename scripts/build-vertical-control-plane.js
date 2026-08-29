'use strict';

/**
 * TSM Vertical Control Plane Builder
 *
 * PM V5.5 is the reference architecture.
 *
 * This script is intentionally conservative:
 *   - discovers existing vertical architecture
 *   - identifies capability gaps
 *   - does NOT overwrite existing vertical implementations
 *   - creates only missing shared/adaptor scaffolding
 *   - produces a build plan before implementation
 *
 * Design principle:
 *   Preserve existing vertical behavior.
 *   Extend through adapters.
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

const CONTROL_PLANE = [
  'structuredData',
  'operationalEvents',
  'findingsExceptions',
  'severityPriority',
  'exposure',
  'relationships',
  'deterministicAggregation',
  'riskScoring',
  'forecasting',
  'decisionGeneration',
  'explainability',
  'humanApproval',
  'actionLifecycle',
  'idempotency',
  'persistence',
  'auditHistory',
  'authenticationAuthorization',
  'verification',
  'predictiveValuesModeled',
  'sourceSystemWritebackControl',
  'executiveRollup',
  'strategistSynthesis',
  'missionCreation',
  'decisionTelemetry',
  'evidenceLineage'
];

const VERTICAL_DIRS = {
  pm: ['server/pm'],
  construction: ['server/construction'],
  healthcare: ['server/healthcare'],
  mortgage: ['server/mortgage'],
  real_estate: ['server/real-estate', 'server/realestate'],
  legal: ['server/legal'],
  bpo: ['server/bpo'],
  schools: ['server/schools'],
  hotelops: ['server/hotelops'],
  insurance: ['server/insurance'],
  finops: ['server/finops-enterprise', 'server/finops'],
  rcm: ['server/rcm', 'server/routes']
};

const CAPABILITY_PATTERNS = {
  structuredData:
    /structured|entity|entities|case|claim|loan|property|vendor|student|booking|patient|invoice/i,

  operationalEvents:
    /event|telemetry|activity|workflow|work.?item|node.?report/i,

  findingsExceptions:
    /finding|exception|anomal|denial|issue|violation|exposure/i,

  severityPriority:
    /severity|priority|critical|high.?risk|score/i,

  exposure:
    /exposure|financial.?impact|amount|loss|cost|revenue/i,

  relationships:
    /relationship|dependency|linked|related|parent.?child/i,

  deterministicAggregation:
    /deterministic|aggregate|aggregation|rollup|summary|rules/i,

  riskScoring:
    /risk.?score|risk.?engine|risk.?level|risk/i,

  forecasting:
    /forecast|projected|projection|predictive|prediction/i,

  decisionGeneration:
    /decision|recommendation|strategist|BNCA|executive/i,

  explainability:
    /explain|reason|rationale|evidence|why/i,

  humanApproval:
    /approval|approve|review|authorized|human.?in.?the.?loop/i,

  actionLifecycle:
    /action|task|mission|execute|execution|status/i,

  idempotency:
    /idempot|dedup|duplicate|request.?id|idempotency.?key/i,

  persistence:
    /postgres|dynamodb|database|persist|store|repository|save/i,

  auditHistory:
    /audit|history|log|decision.?history/i,

  authenticationAuthorization:
    /requireAuth|requireAnyAuth|requireRole|authorization|permission|role/i,

  verification:
    /verify|verification|verified|validation/i,

  predictiveValuesModeled:
    /predictive.?value|modeled|expected|probability|confidence/i,

  sourceSystemWritebackControl:
    /writeback|write.?back|source.?system|external.?system|adapter/i,

  executiveRollup:
    /executive|portfolio|rollup|brief|dashboard/i,

  strategistSynthesis:
    /strategist|synthesis|bnca|recommendation/i,

  missionCreation:
    /mission|mission.?create|create.?mission/i,

  decisionTelemetry:
    /decision.?telemetry|decision.?event|decision.?log/i,

  evidenceLineage:
    /evidence|source|provenance|lineage|trace/i
};

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function walk(dir) {
  const absolute = path.join(ROOT, dir);

  if (!fs.existsSync(absolute)) return [];

  const stat = fs.statSync(absolute);

  if (stat.isFile()) return [absolute];

  let result = [];

  for (const entry of fs.readdirSync(absolute)) {
    if (entry === 'node_modules' || entry === '.git') continue;

    const full = path.join(absolute, entry);

    try {
      if (fs.statSync(full).isDirectory()) {
        result = result.concat(walk(path.relative(ROOT, full)));
      } else if (/\.(js|cjs|mjs|html)$/.test(entry)) {
        result.push(full);
      }
    } catch {
      // Ignore unreadable files.
    }
  }

  return result;
}

function sourceFor(vertical) {
  const dirs = VERTICAL_DIRS[vertical] || [];

  const files = [
    path.join(ROOT, 'server.js'),
    ...dirs.flatMap(walk)
  ];

  const unique = [...new Set(files.filter(fs.existsSync))];

  return {
    files: unique,
    source: unique.map(file => {
      try {
        return fs.readFileSync(file, 'utf8');
      } catch {
        return '';
      }
    }).join('\n')
  };
}

function inspect(vertical) {
  const { files, source } = sourceFor(vertical);

  const capabilities = {};

  for (const capability of CONTROL_PLANE) {
    capabilities[capability] =
      CAPABILITY_PATTERNS[capability]
        ? CAPABILITY_PATTERNS[capability].test(source)
        : false;
  }

  return {
    vertical,
    files: files.map(f => path.relative(ROOT, f)),
    capabilities,
    missing: CONTROL_PLANE.filter(
      capability => !capabilities[capability]
    )
  };
}

function build() {
  console.log('============================================================');
  console.log(' TSM VERTICAL CONTROL PLANE BUILDER');
  console.log('============================================================');
  console.log('');
  console.log('PM V5.5 = CANONICAL REFERENCE');
  console.log('');

  const results = VERTICALS.map(inspect);

  for (const result of results) {
    const passed = CONTROL_PLANE.length - result.missing.length;
    const score = Math.round(
      (passed / CONTROL_PLANE.length) * 100
    );

    console.log(
      `${result.vertical.padEnd(16)} ${String(score).padStart(3)}/100`
    );

    if (result.missing.length) {
      console.log(
        `  missing: ${result.missing.join(', ')}`
      );
    } else {
      console.log('  COMPLETE');
    }

    console.log('');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    gitHead: (() => {
      try {
        return require('child_process')
          .execSync('git rev-parse HEAD', {
            cwd: ROOT,
            encoding: 'utf8'
          })
          .trim();
      } catch {
        return null;
      }
    })(),
    reference: 'PM V5.5',
    controlPlane: CONTROL_PLANE,
    verticals: results
  };

  const reportsDir = path.join(ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, 'vertical-control-plane-build-plan.json'),
    JSON.stringify(report, null, 2)
  );

  const md = [];

  md.push('# TSM Vertical Control Plane Build Plan');
  md.push('');
  md.push(`Generated: ${report.generatedAt}`);
  md.push('');
  md.push('Reference: **PM V5.5**');
  md.push('');
  md.push('| Vertical | Score | Missing capabilities |');
  md.push('|---|---:|---|');

  for (const result of results) {
    const passed =
      CONTROL_PLANE.length - result.missing.length;

    const score = Math.round(
      (passed / CONTROL_PLANE.length) * 100
    );

    md.push(
      `| ${result.vertical} | ${score}/100 | ` +
      `${result.missing.join(', ') || 'None'} |`
    );
  }

  md.push('');
  md.push('## Control Plane');
  md.push('');

  for (const capability of CONTROL_PLANE) {
    md.push(`- ${capability}`);
  }

  md.push('');
  md.push('## Implementation Policy');
  md.push('');
  md.push(
    'Existing vertical behavior must be preserved. ' +
    'Missing capabilities should be implemented through ' +
    'shared control-plane modules and vertical adapters rather ' +
    'than duplicated route logic.'
  );

  fs.writeFileSync(
    path.join(reportsDir, 'vertical-control-plane-build-plan.md'),
    md.join('\n')
  );

  console.log('============================================================');
  console.log(' BUILD PLAN');
  console.log('============================================================');
  console.log('');
  console.log(
    'reports/vertical-control-plane-build-plan.json'
  );
  console.log(
    'reports/vertical-control-plane-build-plan.md'
  );
}

build();
