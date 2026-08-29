'use strict';

/**
 * TSM Vertical Intelligence Richness Audit
 *
 * PM V5.5 is the reference implementation.
 *
 * This first pass is intentionally evidence-based/static:
 *   - discovers vertical modules
 *   - inventories API routes
 *   - detects engines/contracts
 *   - detects persistence/audit/governance signals
 *   - scores architectural richness
 *
 * It DOES NOT modify production files.
 *
 * Runtime validation is handled separately.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();

const VERTICALS = [
  'pm',
  'mortgage',
  'construction',
  'realestate',
  'legal',
  'bpo',
  'healthcare',
  'schools',
  'hotelops',
  'insurance',
  'finops',
  'rcm'
];

const LABELS = {
  pm: 'PM',
  mortgage: 'Mortgage',
  construction: 'Construction',
  realestate: 'Real Estate',
  legal: 'Legal',
  bpo: 'BPO',
  healthcare: 'Healthcare',
  schools: 'Schools',
  hotelops: 'HotelOps',
  insurance: 'Insurance',
  finops: 'FinOps',
  rcm: 'RCM-OS'
};

const SEARCH_ROOTS = [
  'server',
  'scripts',
  'html',
  'middleware'
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function walk(dir) {
  const result = [];

  if (!fs.existsSync(dir)) return result;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name.startsWith('.')
    ) {
      continue;
    }

    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else {
      result.push(full);
    }
  }

  return result;
}

const ALL_FILES = SEARCH_ROOTS
  .map(dir => path.join(ROOT, dir))
  .filter(fs.existsSync)
  .flatMap(walk);

const TEXT_FILES = ALL_FILES.filter(file =>
  /\.(js|cjs|mjs|json|html|sh|py|ts|tsx|jsx)$/i.test(file)
);

const CONTENT = new Map();

for (const file of TEXT_FILES) {
  try {
    CONTENT.set(file, fs.readFileSync(file, 'utf8'));
  } catch (_) {}
}

function matchingFiles(patterns) {
  const results = [];

  for (const [file, text] of CONTENT.entries()) {
    if (patterns.some(pattern => pattern.test(text))) {
      results.push(path.relative(ROOT, file));
    }
  }

  return [...new Set(results)].sort();
}

function matchingLines(patterns) {
  const results = [];

  for (const [file, text] of CONTENT.entries()) {
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      if (patterns.some(pattern => pattern.test(line))) {
        results.push({
          file: path.relative(ROOT, file),
          line: index + 1,
          text: line.trim().slice(0, 220)
        });
      }
    });
  }

  return results;
}

function routeInventory(token) {
  const routes = new Set();

  const regex =
    new RegExp(
      `['"\`](/api/(?:${token})[^'"\`\\s)]*)`,
      'gi'
    );

  for (const text of CONTENT.values()) {
    let match;

    while ((match = regex.exec(text))) {
      routes.add(match[1]);
    }
  }

  return [...routes].sort();
}

function verticalToken(vertical) {
  const aliases = {
    pm: ['pm'],
    mortgage: ['mortgage'],
    construction: ['construction'],
    realestate: ['real-estate', 'realestate', 'realty'],
    legal: ['legal'],
    bpo: ['bpo'],
    healthcare: ['healthcare', 'health', 'hc'],
    schools: ['schools', 'school'],
    hotelops: ['hotelops', 'hotel'],
    insurance: ['insurance'],
    finops: ['finops'],
    rcm: ['rcm', 'rcm-os']
  };

  return aliases[vertical] || [vertical];
}

function hasAny(patterns) {
  return matchingFiles(patterns).length > 0;
}

function evidence(patterns) {
  return matchingLines(patterns).slice(0, 12);
}

function scoreData(vertical) {
  const aliases = verticalToken(vertical);

  const entity = hasAny([
    new RegExp(`server/.+(?:${aliases.join('|')})`, 'i'),
    new RegExp(`(?:${aliases.join('|')}).*(?:entity|entities|portfolio|unit|case|client|property|project|work.?order|loan)`, 'i')
  ]);

  const events = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:event|events|status|activity|history|sla)`, 'i')
  ]);

  const findings = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:finding|findings|exception|exceptions|node-report|node.?reports|issue|issues)`, 'i')
  ]);

  const severity = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:severity|priority|risk.?level|critical|high|medium|low)`, 'i')
  ]);

  const exposure = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:exposure|financial.?impact|loss|cost|amount|value|revenue|dollar)`, 'i')
  ]);

  const relationships = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:relationship|relationships|link|linked|parent.?child|foreign.?key)`, 'i')
  ]);

  return {
    score:
      (entity ? 5 : 0) +
      (events ? 5 : 0) +
      (findings ? 5 : 0) +
      (severity ? 5 : 0) +
      (exposure ? 5 : 0) +
      (relationships ? 5 : 0),

    checks: {
      structuredEntities: entity,
      operationalEvents: events,
      findingsExceptions: findings,
      severityPriority: severity,
      exposure: exposure,
      relationships
    }
  };
}

function scoreIntelligence(vertical) {
  const aliases = verticalToken(vertical);

  const deterministic = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:deterministic|aggregation|aggregate|rollup|rule.?engine)`, 'i')
  ]);

  const risk = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:risk.?engine|risk.?score|riskScore|risk level)`, 'i')
  ]);

  const forecast = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:forecast|projection|predictive|prediction)`, 'i')
  ]);

  const decision = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:decision|strategist|executive.?portal|bnca)`, 'i')
  ]);

  const explainability = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:explain|rationale|reason|confidence|decision_summary)`, 'i')
  ]);

  return {
    score:
      (deterministic ? 5 : 0) +
      (risk ? 5 : 0) +
      (forecast ? 5 : 0) +
      (decision ? 5 : 0) +
      (explainability ? 5 : 0),

    checks: {
      deterministicAggregation: deterministic,
      riskScoring: risk,
      forecasting: forecast,
      decisionGeneration: decision,
      explainability
    }
  };
}

function scoreGovernance(vertical) {
  const aliases = verticalToken(vertical);

  const humanApproval = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:humanApprovalRequired|human.?approval|approvalRequired|approval)`, 'i')
  ]);

  const lifecycle = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:OPEN|ACKNOWLEDGED|IN_PROGRESS|RESOLVED|VERIFIED|status transition|transition)`, 'i')
  ]);

  const idempotency = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:idempot|stable.?id|decision.?id|action.?id)`, 'i')
  ]);

  const writeback = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:sourceSystemWriteback|writeback|source.?system)`, 'i')
  ]);

  const modeled = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:predictiveValuesAreModeled|modeled.?value|modeled)`, 'i')
  ]);

  return {
    score:
      (humanApproval ? 5 : 0) +
      (lifecycle ? 5 : 0) +
      (idempotency ? 5 : 0) +
      (writeback ? 5 : 0) +
      (modeled ? 5 : 0),

    checks: {
      humanApproval,
      actionLifecycle: lifecycle,
      idempotency,
      sourceSystemWritebackControl: writeback,
      predictiveValuesModeled: modeled
    }
  };
}

function scoreRuntime(vertical) {
  const aliases = verticalToken(vertical);

  const persistence = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:persist|database|postgres|mongo|ledger|store|upsert)`, 'i')
  ]);

  const audit = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:audit|status.?event|history|event.?log)`, 'i')
  ]);

  const auth = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:require.?auth|authorization|authenticate|session|actor|role)`, 'i')
  ]) || vertical === 'pm';

  const verification = hasAny([
    new RegExp(`(?:${aliases.join('|')}).*(?:verif|validate|validation|verified)`, 'i')
  ]);

  return {
    score:
      (persistence ? 5 : 0) +
      (audit ? 5 : 0) +
      (auth ? 5 : 0) +
      (verification ? 5 : 0),

    checks: {
      persistence,
      auditHistory: audit,
      authenticationAuthorization: auth,
      verification
    }
  };
}

function classify(score) {
  if (score >= 85) return 'PM-LEVEL / ENTERPRISE READY';
  if (score >= 70) return 'HIGH FIT / ADAPT PM PATTERN';
  if (score >= 50) return 'MODERATE / BUILD MISSING CONTROL LAYERS';
  if (score >= 30) return 'LOW / STRUCTURAL FOUNDATION NEEDED';
  return 'NOT A CURRENT FIT';
}

function patternFitness(vertical, total) {
  if (vertical === 'insurance') {
    return 'LOW — training/certification shape';
  }

  if (vertical === 'rcm') {
    return 'LOW — control-plane migration prerequisite';
  }

  if (vertical === 'finops') {
    return 'LOW — backend foundation incomplete';
  }

  if (total >= 70) return 'HIGH';
  if (total >= 50) return 'MEDIUM';
  return 'LOW';
}

function recommendation(vertical, total) {
  if (vertical === 'pm') {
    return 'REFERENCE IMPLEMENTATION — PM V5.5 benchmark';
  }

  if (total >= 70) {
    return 'ADAPT PM GOVERNED CONTROL-PLANE PATTERN';
  }

  if (total >= 50) {
    return 'BUILD MISSING INTELLIGENCE / GOVERNANCE LAYERS';
  }

  if (total >= 30) {
    return 'STRENGTHEN STRUCTURED DATA + CONTROL PLANE FIRST';
  }

  return 'DO NOT FORCE PM PATTERN YET';
}

function gitCommit() {
  try {
    return cp.execSync(
      'git log -1 --oneline',
      { cwd: ROOT, encoding: 'utf8' }
    ).trim();
  } catch (_) {
    return null;
  }
}

const results = [];

for (const vertical of VERTICALS) {
  const data = scoreData(vertical);
  const intelligence = scoreIntelligence(vertical);
  const governance = scoreGovernance(vertical);
  const runtime = scoreRuntime(vertical);

  const total =
    data.score +
    intelligence.score +
    governance.score +
    runtime.score;

  results.push({
    vertical,
    label: LABELS[vertical],
    score: total,
    dataRichness: data.score,
    intelligence: intelligence.score,
    governance: governance.score,
    runtime: runtime.score,
    classification: classify(total),
    patternFitness: patternFitness(vertical, total),
    recommendedPath: recommendation(vertical, total),
    routes: routeInventory(verticalToken(vertical).join('|')),
    checks: {
      data: data.checks,
      intelligence: intelligence.checks,
      governance: governance.checks,
      runtime: runtime.checks
    },
    evidence: {
      data: evidence([
        new RegExp(`(?:${verticalToken(vertical).join('|')}).*(?:finding|exception|portfolio|node|work.?order|case|exposure)`, 'i')
      ]),
      intelligence: evidence([
        new RegExp(`(?:${verticalToken(vertical).join('|')}).*(?:decision|risk|forecast|bnca|strategist|executive)`, 'i')
      ]),
      governance: evidence([
        new RegExp(`(?:${verticalToken(vertical).join('|')}).*(?:approval|writeback|modeled|idempot|status)`, 'i')
      ])
    }
  });
}

const output = {
  benchmark: {
    vertical: 'pm',
    version: 'V5.5',
    score: 100,
    categories: {
      data: 30,
      intelligence: 25,
      governance: 25,
      runtime: 20
    }
  },
  generatedAt: new Date().toISOString(),
  gitHead: gitCommit(),
  verticals: results
};

const reportsDir = path.join(ROOT, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

fs.writeFileSync(
  path.join(reportsDir, 'vertical-intelligence-richness.json'),
  JSON.stringify(output, null, 2) + '\n'
);

function mark(value) {
  return value ? '✅' : '—';
}

let md = '';

md += '# TSM Vertical Intelligence Richness Audit\n\n';
md += `Generated: ${output.generatedAt}\n\n`;
md += `Git HEAD: ${output.gitHead || 'unknown'}\n\n`;

md += '## PM V5.5 Reference\n\n';
md += '| Category | Maximum |\n|---|---:|\n';
md += '| Data richness | 30 |\n';
md += '| Intelligence | 25 |\n';
md += '| Governance | 25 |\n';
md += '| Runtime | 20 |\n';
md += '| **Total** | **100** |\n\n';

md += '## Vertical Scorecard\n\n';
md += '| Vertical | Data | Intelligence | Governance | Runtime | Total | Fitness |\n';
md += '|---|---:|---:|---:|---:|---:|---|\n';

for (const item of results) {
  md += `| ${item.label} | ${item.dataRichness}/30 | ${item.intelligence}/25 | ${item.governance}/25 | ${item.runtime}/20 | **${item.score}/100** | ${item.patternFitness} |\n`;
}

md += '\n## Detailed Results\n\n';

for (const item of results) {
  md += `### ${item.label} — ${item.score}/100\n\n`;
  md += `**Classification:** ${item.classification}\n\n`;
  md += `**Recommended path:** ${item.recommendedPath}\n\n`;

  md += '**Data**\n\n';
  for (const [key, value] of Object.entries(item.checks.data)) {
    md += `- ${mark(value)} ${key}\n`;
  }

  md += '\n**Intelligence**\n\n';
  for (const [key, value] of Object.entries(item.checks.intelligence)) {
    md += `- ${mark(value)} ${key}\n`;
  }

  md += '\n**Governance**\n\n';
  for (const [key, value] of Object.entries(item.checks.governance)) {
    md += `- ${mark(value)} ${key}\n`;
  }

  md += '\n**Runtime**\n\n';
  for (const [key, value] of Object.entries(item.checks.runtime)) {
    md += `- ${mark(value)} ${key}\n`;
  }

  md += '\n**Routes discovered:**\n\n';

  if (item.routes.length) {
    for (const route of item.routes) {
      md += `- \`${route}\`\n`;
    }
  } else {
    md += '- None discovered\n';
  }

  md += '\n';
}

fs.writeFileSync(
  path.join(reportsDir, 'vertical-intelligence-richness.md'),
  md
);

console.log('============================================================');
console.log(' TSM VERTICAL INTELLIGENCE RICHNESS AUDIT');
console.log('============================================================');
console.log('');
console.log('PM V5.5 = 100/100 REFERENCE');
console.log('');

for (const item of results) {
  console.log(
    `${item.label.padEnd(14)} ${String(item.score).padStart(3)}/100` +
    `  data=${String(item.dataRichness).padStart(2)}/30` +
    `  intelligence=${String(item.intelligence).padStart(2)}/25` +
    `  governance=${String(item.governance).padStart(2)}/25` +
    `  runtime=${String(item.runtime).padStart(2)}/20`
  );
}

console.log('');
console.log('Reports:');
console.log('  reports/vertical-intelligence-richness.json');
console.log('  reports/vertical-intelligence-richness.md');
console.log('');
console.log('IMPORTANT: This is a discovery score, not yet a runtime certification.');
