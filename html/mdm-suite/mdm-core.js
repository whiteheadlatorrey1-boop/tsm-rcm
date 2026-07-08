// mdm-core.js — deterministic MDM logic. No AI dependency. Testable standalone.

function levenshtein(a, b) {
  a = (a || '').toLowerCase().trim();
  b = (b || '').toLowerCase().trim();
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarity(a, b) {
  const maxLen = Math.max((a || '').length, (b || '').length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Weighted match score across configurable fields per domain
const FIELD_WEIGHTS = {
  customer:     { name: 0.5, address: 0.25, taxId: 0.25 },
  vendor:       { name: 0.5, address: 0.25, taxId: 0.25 },
  product:      { name: 0.6, sku: 0.4 },
  employee:     { name: 0.5, employeeId: 0.5 },
  asset:        { name: 0.4, assetTag: 0.6 },
  location:     { name: 0.5, address: 0.5 },
  orgunit:      { name: 0.6, orgCode: 0.4 },
  costcenter:   { name: 0.5, ccCode: 0.5 },
  profitcenter: { name: 0.5, pcCode: 0.5 },
  gl:           { name: 0.4, accountNumber: 0.6 }
};

function recordSimilarity(recA, recB, domain) {
  const weights = FIELD_WEIGHTS[domain] || {};
  let score = 0, totalWeight = 0;
  for (const [field, weight] of Object.entries(weights)) {
    score += similarity(recA[field], recB[field]) * weight;
    totalWeight += weight;
  }
  return totalWeight ? score / totalWeight : 0;
}

// Fields that are meant to be unique identifiers, not free text. If two records share
// an identical non-empty value in any of these, that alone is strong duplicate evidence
// — stronger than fuzzy name similarity, which can legitimately be low for the same
// real-world entity (e.g. "Whitfield, Latorrey" vs "Whitfield, L." with a shared
// employeeId). Without this, an exact identifier match can still lose to a borderline
// weighted score and silently fall below threshold.
const IDENTIFIER_FIELDS = ['taxId', 'employeeId', 'assetTag', 'sku', 'accountNumber', 'ccCode', 'pcCode', 'orgCode'];

function sharedIdentifier(recA, recB) {
  for (const field of IDENTIFIER_FIELDS) {
    const a = recA[field], b = recB[field];
    if (!a || !b) continue;
    const av = String(a).trim(), bv = String(b).trim();
    if (av === '' || av !== bv) continue;
    // Guard against sentinel/placeholder values (e.g. two unrelated employees both
    // left with employeeId "N/A") forcing a false match. A real identifier match
    // must also satisfy that field's own format validator — reusing the existing
    // per-field regex rather than a separate blacklist that could drift out of sync.
    const validator = FORMAT_VALIDATORS[field];
    if (validator && !validator(av)) continue;
    return field;
  }
  return null;
}

function findDuplicates(records, domain, threshold = 0.82) {
  const matches = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      let score = recordSimilarity(records[i], records[j], domain);
      const idField = sharedIdentifier(records[i], records[j]);
      if (idField) score = Math.max(score, 0.95);
      if (score >= threshold) {
        matches.push({
          recordA: records[i],
          recordB: records[j],
          matchScore: Math.round(score * 100),
          matchReason: idField ? 'identifier_exact' : 'fuzzy_name',
          matchField: idField || null,
          domain
        });
      }
    }
  }
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// Data quality scoring — completeness + format validation
const REQUIRED_FIELDS = {
  customer:     ['name', 'address', 'taxId', 'email'],
  vendor:       ['name', 'address', 'taxId'],
  product:      ['name', 'sku', 'category'],
  employee:     ['name', 'employeeId', 'department'],
  asset:        ['name', 'assetTag', 'location'],
  location:     ['name', 'address', 'region'],
  orgunit:      ['name', 'parentUnit', 'orgCode'],
  costcenter:   ['name', 'ccCode', 'owner'],
  profitcenter: ['name', 'pcCode', 'owner'],
  gl:           ['name', 'accountNumber']
};

const FORMAT_VALIDATORS = {
  email:         v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ''),
  taxId:         v => /^\d{2}-\d{7}$/.test(v || ''),
  accountNumber: v => /^\d{4,6}$/.test(v || ''),
  sku:           v => /^PRD-\d{3,6}$/.test(v || ''),
  employeeId:    v => /^EMP-\d{3,6}$/.test(v || ''),
  assetTag:      v => /^AST-\d{3,6}$/.test(v || ''),
  orgCode:       v => /^ORG-\d{3,6}$/.test(v || ''),
  ccCode:        v => /^CC-\d{3,6}$/.test(v || ''),
  pcCode:        v => /^PC-\d{3,6}$/.test(v || '')
};

function scoreRecord(record, domain) {
  const required = REQUIRED_FIELDS[domain] || [];
  let completeness = 0;
  const issues = [];

  for (const field of required) {
    if (record[field] && String(record[field]).trim() !== '') {
      completeness += 1;
    } else {
      issues.push(`Missing required field: ${field}`);
    }
  }
  completeness = required.length ? completeness / required.length : 1;

  let formatScore = 1;
  let formatChecks = 0;
  for (const [field, validator] of Object.entries(FORMAT_VALIDATORS)) {
    if (record[field] !== undefined) {
      formatChecks++;
      if (!validator(record[field])) {
        formatScore -= 1;
        issues.push(`Invalid format: ${field} = "${record[field]}"`);
      }
    }
  }
  formatScore = formatChecks ? Math.max(0, 1 - (formatChecks - formatScore) / formatChecks) : 1;

  const overall = Math.round((completeness * 0.6 + formatScore * 0.4) * 100);
  return { recordId: record.id, overall, completeness: Math.round(completeness * 100), formatScore: Math.round(formatScore * 100), issues };
}

function scoreDataset(records, domain) {
  const scores = records.map(r => scoreRecord(r, domain));
  const avgScore = Math.round(scores.reduce((s, r) => s + r.overall, 0) / (scores.length || 1));
  return { domain, avgScore, recordCount: records.length, scores };
}

// ---------------------------------------------------------------------------
// Phase 5 — Recommendation engine. Deterministic, no LLM call: every
// recommendation traces to a real duplicate match plus the quality score of
// both candidate records, and (when a mergeLog is supplied) to real past
// decisions for the same domain/matchReason pair. This is the "explain why"
// data the strategist UI and /api/mdm/recommendations route consume.
// ---------------------------------------------------------------------------

function recIdFor(domain, match) {
  return `REC-${domain}-${match.recordA.id}-${match.recordB.id}`;
}

// Counts prior APPROVED/REJECTED decisions in the same domain that used the
// same matchReason (identifier_exact vs fuzzy_name) — this is the real
// "resolved N times before" signal, computed from the actual decision log
// rather than invented.
function historicalPatternFor(domain, matchReason, mergeLog) {
  const log = Array.isArray(mergeLog) ? mergeLog : [];
  const priorApproved = log.filter(h =>
    h.domain === domain &&
    h.decision === 'APPROVED' &&
    (h.matchReason ? h.matchReason === matchReason : true)
  );
  const priorRejected = log.filter(h =>
    h.domain === domain &&
    h.decision === 'REJECTED' &&
    (h.matchReason ? h.matchReason === matchReason : true)
  );
  return {
    approvedCount: priorApproved.length,
    rejectedCount: priorRejected.length,
    lastDecisionAt: priorApproved.length ? priorApproved[priorApproved.length - 1].ts : null
  };
}

// Risk = how much is exposed if this duplicate is left unresolved. Combines
// how bad the worse-scoring record's quality is with how confident the match
// itself is. 0-100, higher = more urgent.
function riskFor(match, records) {
  const a = records.find(r => r.id === match.recordA.id) || {};
  const b = records.find(r => r.id === match.recordB.id) || {};
  const worstQuality = Math.min(
    a.quality != null ? a.quality : 100,
    b.quality != null ? b.quality : 100
  );
  const qualityRisk = 100 - worstQuality;
  const matchRisk = match.matchScore;
  return Math.round(qualityRisk * 0.4 + matchRisk * 0.6);
}

function buildRecommendations(records, duplicateMatches, domain, mergeLog) {
  return duplicateMatches.map(m => {
    const pattern = historicalPatternFor(domain, m.matchReason, mergeLog);
    const risk = riskFor(m, records);
    const requiresApproval = !(m.matchReason === 'identifier_exact' && m.matchScore >= 95);
    return {
      id: recIdFor(domain, m),
      domain,
      issue: `Duplicate ${domain} identities: ${m.recordA.id} \u2194 ${m.recordB.id}`,
      risk,
      action: 'MERGE_RECORDS',
      confidence: m.matchScore,
      requiresApproval,
      survivorId: m.recordA.id,
      mergedId: m.recordB.id,
      matchReason: m.matchReason,
      matchField: m.matchField || null,
      historicalPattern: pattern
    };
  }).sort((x, y) => y.risk - x.risk);
}

module.exports = {
  findDuplicates, scoreDataset, scoreRecord, recordSimilarity, similarity,
  buildRecommendations, recIdFor, historicalPatternFor, riskFor
};