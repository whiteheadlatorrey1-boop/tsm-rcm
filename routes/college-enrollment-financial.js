// routes/college-enrollment-financial.js
//
// Server-side financial exposure computation AND AI yield/enrollment
// analysis for the College Enrollment war room. Modeled directly on
// routes/college-finaid-financial.js: same private-rate-card-server-side-
// only pattern, same items/total/confidence response shape.
//
// The rate card lives only in
// server/private-config/college/enrollment-financial-model.json and is
// never sent to the client — only the *computed* dollar totals are.
//
// Mount in server.js:
//   app.use('/api/college/enrollment', requireAnyAuth, require('./routes/college-enrollment-financial'));
//
// Endpoints:
//   POST /api/college/enrollment/financial-summary
//   Body: {
//     kpis: { total_deposited, ... },
//     melt_breaches: [{ id, days_to_term_start, engagement_score, record }, ...],
//     completeness_breaches: [{ id, deadline_days_remaining, days_open, record }, ...],
//     yield_segments: [{ segment_id, segment_label, deposited, target_deposits, band }, ...]
//   }
//   Response:
//   {
//     currency, melt_exposure_total, melt_exposure_items,
//     completeness_exposure_total, completeness_exposure_items,
//     yield_gap_exposure_total, yield_gap_exposure_items,
//     total_exposure, note, melt_confidence, completeness_confidence, yield_confidence
//   }
//
//   POST /api/college/enrollment/analysis
//   Body: { kpis, melt_breaches, completeness_breaches, yield_segments, context, maxTokens }
//   Response: { ok, answer, degraded, createdAt }
//
// Env:
//   GROQ_API_KEY          — required for real AI output on /analysis (falls
//                            back to a clearly-labeled degraded response
//                            otherwise, still returns 200)
//   TSM_COLLEGE_MODEL      — optional override for /analysis, defaults to
//                            TSM_FINANCE_MODEL, then 'openai/gpt-oss-120b'

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const RATE_CARD_PATH = path.join(__dirname, '..', 'server', 'private-config', 'college', 'enrollment-financial-model.json');

let RATE_CARD = null;
try {
  RATE_CARD = JSON.parse(fs.readFileSync(RATE_CARD_PATH, 'utf8'));
} catch (err) {
  console.error('[college-enrollment-financial] Failed to load rate card at', RATE_CARD_PATH, err.message);
  RATE_CARD = null;
}

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = () => process.env.TSM_COLLEGE_MODEL || process.env.TSM_FINANCE_MODEL || 'openai/gpt-oss-120b';

const ENROLLMENT_SYSTEM_PROMPT =
  'You are an Enrollment Management AI for a college Admissions/Enrollment office. ' +
  'Expert in summer melt (deposited students who never enroll), application completeness ' +
  'backlog ahead of admission-decision deadlines, and yield-funnel performance by recruiting ' +
  'segment against deposit targets. Given structured case data, KPIs, and risk breaches, ' +
  'identify the highest-risk melt cases, the completeness cases closest to their deadline, and ' +
  'the yield segments furthest behind target, and recommend the single most important next ' +
  'action per item, prioritized by days-to-term-start / deadline proximity / deposit gap size. ' +
  'Reference case/segment IDs. Be precise and operational. No preamble. For any deadline or ' +
  'date: use only a value explicitly present in the data provided — never calculate, estimate, ' +
  'or infer one. Only state a case as enrolled/complete/on-track if the data confirms it — ' +
  'anything shown as open, incomplete, or at-risk must be listed as still-needed, not treated ' +
  'as resolved.';

async function callGroq(systemPrompt, message, maxTokens = 900) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { text: null, degraded: true, reason: 'GROQ_API_KEY not configured on server' };
  try {
    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(),
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        max_tokens: maxTokens,
        temperature: 0.25
      })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { text: null, degraded: true, reason: `Upstream ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';
    if (!text) return { text: null, degraded: true, reason: 'Empty upstream response' };
    return { text, degraded: false };
  } catch (err) {
    return { text: null, degraded: true, reason: err.message };
  }
}

function asArray(x) {
  return Array.isArray(x) ? x.filter(item => item != null && typeof item === 'object') : [];
}

function meltExposure(breaches) {
  if (!RATE_CARD || !RATE_CARD.melt_probability_by_severity || RATE_CARD.avg_annual_tuition_revenue_per_enrolled_student == null) {
    return { total: 0, currency: RATE_CARD ? RATE_CARD.currency : 'USD', items: [] };
  }
  const revenue = RATE_CARD.avg_annual_tuition_revenue_per_enrolled_student;
  const probBand = RATE_CARD.melt_probability_by_severity;
  const items = (breaches || []).map(b => {
    const rec = b.record || {};
    const severity = (rec.severity || 'MEDIUM').toUpperCase();
    const prob = probBand[severity] != null ? probBand[severity] : 0.30;
    const exposure = Math.round(revenue * prob);
    return {
      id: b.id,
      student_ref: rec.student_ref,
      severity,
      days_to_term_start: b.days_to_term_start,
      melt_probability: prob,
      exposure
    };
  }).sort((a, b) => b.exposure - a.exposure);
  return { total: items.reduce((s, it) => s + it.exposure, 0), currency: RATE_CARD.currency || 'USD', items };
}

function completenessExposure(breaches) {
  if (!RATE_CARD || RATE_CARD.application_reprocessing_cost_per_day_open == null) {
    return { total: 0, currency: RATE_CARD ? RATE_CARD.currency : 'USD', items: [] };
  }
  const rate = RATE_CARD.application_reprocessing_cost_per_day_open;
  const items = (breaches || []).map(b => {
    const days = Math.max(1, Math.round(b.days_open || 0));
    const exposure = Math.round(days * rate);
    return {
      id: b.id,
      student_ref: b.record && b.record.student_ref,
      deadline_days_remaining: b.deadline_days_remaining,
      days_open: days,
      exposure
    };
  }).sort((a, b) => a.deadline_days_remaining - b.deadline_days_remaining);
  return { total: items.reduce((s, it) => s + it.exposure, 0), currency: RATE_CARD.currency || 'USD', items };
}

function yieldGapExposure(segments) {
  if (!RATE_CARD || RATE_CARD.yield_gap_revenue_per_deposit == null) {
    return { total: 0, currency: RATE_CARD ? RATE_CARD.currency : 'USD', items: [] };
  }
  const rate = RATE_CARD.yield_gap_revenue_per_deposit;
  const items = (segments || [])
    .filter(s => s.band === 'AT_RISK' || s.band === 'BEHIND')
    .map(s => {
      const gap = Math.max(0, (s.target_deposits || 0) - (s.deposited || 0));
      const exposure = Math.round(gap * rate);
      return { id: s.segment_id, segment_label: s.segment_label, band: s.band, deposit_gap: gap, exposure };
    })
    .sort((a, b) => b.exposure - a.exposure);
  return { total: items.reduce((s, it) => s + it.exposure, 0), currency: RATE_CARD.currency || 'USD', items };
}

function confidenceFor(rateCardKeyPresent, note) {
  if (!rateCardKeyPresent) {
    return { confidence: 30, note: ' Rate card is missing this key, so exposure defaulted to $0 — treat as unverified.' };
  }
  return { confidence: 90, note: note || '' };
}

// POST /api/college/enrollment/financial-summary
router.post('/financial-summary', (req, res) => {
  if (!RATE_CARD) {
    return res.status(500).json({ error: 'financial model unavailable' });
  }
  const { melt_breaches, completeness_breaches, yield_segments } = req.body || {};

  const melt = meltExposure(asArray(melt_breaches));
  const completeness = completenessExposure(asArray(completeness_breaches));
  const yieldGap = yieldGapExposure(asArray(yield_segments));

  res.json({
    currency: melt.currency || completeness.currency || yieldGap.currency || 'USD',
    melt_exposure_total: melt.total,
    melt_exposure_items: melt.items,
    completeness_exposure_total: completeness.total,
    completeness_exposure_items: completeness.items,
    yield_gap_exposure_total: yieldGap.total,
    yield_gap_exposure_items: yieldGap.items,
    total_exposure: melt.total + completeness.total + yieldGap.total,
    note: RATE_CARD.note || null,
    melt_confidence: confidenceFor(!!RATE_CARD.melt_probability_by_severity),
    completeness_confidence: confidenceFor(RATE_CARD.application_reprocessing_cost_per_day_open != null),
    yield_confidence: confidenceFor(RATE_CARD.yield_gap_revenue_per_deposit != null)
  });
});

// POST /api/college/enrollment/analysis
router.post('/analysis', async (req, res) => {
  const { kpis, melt_breaches, completeness_breaches, yield_segments, context, maxTokens } = req.body || {};
  const summary = JSON.stringify({
    kpis,
    melt_breaches,
    completeness_breaches,
    yield_segments,
    counts: {
      melt_breaches: Array.isArray(melt_breaches) ? melt_breaches.length : undefined,
      completeness_breaches: Array.isArray(completeness_breaches) ? completeness_breaches.length : undefined,
      yield_segments: Array.isArray(yield_segments) ? yield_segments.length : undefined
    }
  }, null, 2);
  const prompt = `Current Enrollment/Yield snapshot:\n${summary}\n\n` +
    (context ? `Additional context: ${context}\n\n` : '') +
    `Identify the highest-risk melt cases, the application-completeness cases closest to their deadline, and the yield segments furthest behind target, and recommend the single most important next action for each. Reference case/segment IDs.`;

  const { text, degraded, reason } = await callGroq(ENROLLMENT_SYSTEM_PROMPT, prompt, maxTokens || 900);
  if (degraded) {
    return res.json({
      ok: true,
      answer: `AI analysis is temporarily unavailable (${reason}). Case data above is still accurate — please try again shortly.`,
      degraded: true,
      createdAt: new Date().toISOString()
    });
  }
  return res.json({ ok: true, answer: text, degraded: false, createdAt: new Date().toISOString() });
});

module.exports = router;
