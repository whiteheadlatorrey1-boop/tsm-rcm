/* ══════════════════════════════════════════════════════════════════════
   POST /api/doc-router/playbook
   ------------------------------------------------------------------
   Drop-in addition to server.js, placed directly after the existing
   /api/doc-router/classify route (~line 1488) so it can reuse
   GROQ_TEXT_MODEL and the same conventions.

   WHAT THIS DOES
   Takes the already-classified document (documentType, exclusionCode,
   vendor, amount, defectFlags, summary, and — new — the raw extracted
   text) and generates a narrative + action steps + risk assessment
   GROUNDED IN THIS SPECIFIC DOCUMENT, instead of the fixed STEP_SETS
   lookup table in openHcNodeWithDoc() on the frontend.

   WHAT THIS DELIBERATELY DOES NOT DO
   It does NOT decide checkStatus or which node/specialist the doc
   routes to. That stays on the frontend, deterministic, driven by
   HC_CODE_NODE / HC_TYPE_NODE string-matching on the exclusion code —
   unchanged. Routing a denial to the wrong specialist because a model
   miscategorized it is a worse failure than a generic step list, so
   the safety-relevant decision stays rule-based and auditable; only
   the *content* (narrative/steps/risk rationale) is generated. If you
   later want the model to also propose checkStatus, have it return a
   suggestion and diff it against the deterministic value rather than
   trusting it outright — surfacing disagreement is more useful than
   silently overriding a rule you already trust.

   FAILURE MODE
   Unlike /api/doc-router/classify (which 502s on failure — a doc that
   fails to classify just doesn't get filed anywhere, so failing loud
   is correct), this route degrades to the same template steps the
   frontend used before, server-side, so callers always get a 200 with
   *something* clinically usable. This endpoint sits in front of an
   active billing/appeal workflow — returning a hard error mid-triage
   is worse than returning the conservative generic playbook.
   ══════════════════════════════════════════════════════════════════════ */

// Same fixed fallback content as the current frontend STEP_SETS — kept
// here so the server can degrade gracefully without depending on the
// client to have its own copy in sync.
const PLAYBOOK_FALLBACK_STEPS = {
  DENIAL_RISK: ['Pull full EOB/ERA — identify exact CARC/RARC denial codes',
    'Verify CPT/ICD-10 pairing and modifier alignment',
    'Confirm appeal window — timely filing deadline critical',
    'Draft appeal with medical necessity documentation',
    'Submit via payer portal and log tracking number in AR'],
  AUTH_BLOCK: ['Verify current prior auth status for all procedures',
    'Contact payer prior auth line — escalate if wait > 2 hrs',
    'Do NOT bill until auth is confirmed and on file',
    'Document auth number in claim header before submission',
    'Set 48-hr follow-up until resolved'],
  PAYMENT_BLOCK: ['Pull ERA/835 and compare posted amounts to contracted rate',
    'Flag variances >5% as underpayments — initiate appeal',
    'Check for payer hold — contact payer relations if active',
    'Post clean items; quarantine disputed amounts',
    'Escalate unresolved ERA failures within 24 hours'],
  COMPLIANCE_BLOCK: ['Halt billing until all compliance flags are cleared',
    'Obtain updated HIPAA authorization if expired',
    'Verify OIG exclusion list for all providers on this account',
    'Complete documentation checklist before releasing to billing',
    'File compliance resolution memo and update score tracker'],
  LEGAL_HOLD: ['Escalate to legal counsel immediately',
    'Document chain of custody for all related files',
    'Suspend vendor payments pending legal clearance',
    'Prepare regulatory defense memo if requested',
    'Set 48-hr check-in cadence with legal team'],
  DOCUMENTATION_BLOCK: ['Send provider query — 24-hour response expectation',
    'Block claim release for undocumented encounters',
    'Route corrected records to coding for ICD-10 validation',
    'Re-submit to billing queue only after defects resolved'],
  ACTIVE: ['Review document for anomalies', 'Escalate to node specialist',
    'Document findings in AR system', 'Follow up within 48 hours'],
};

const PLAYBOOK_PROMPT = `You are TSM's billing/denial triage assistant. You are given a document that has already been classified and routed — your only job is to write the specific, actionable playbook a billing specialist should follow for THIS document, grounded in its actual content. Do not invent facts not present in the input. Return ONLY valid JSON, no markdown fences, no commentary.

Return JSON matching exactly this schema:
{
  "narrative": one or two sentences stating what's wrong, citing the specific payer/code/policy/amount from the input — not a generic category description,
  "steps": array of 3-6 short, specific, actionable steps a billing specialist would actually do next for THIS document. Reference the specific denial code, policy bulletin, missing documentation, or clinical detail mentioned in the input wherever the input contains one. Do not output generic steps that would apply to any document in this category if the input gives you something more specific to say,
  "risk": integer 0-100 — likelihood-weighted financial/compliance risk if this is not resolved, considering dollar exposure AND how strong the underlying denial/dispute appears to be from the input (not dollar amount alone),
  "riskRationale": one sentence explaining the risk number}`;

// Separate limiter from classify's — this fires far less often (only when
// an operator opens a routed doc into its war room node) and shouldn't
// compete with upload-time classification traffic for the same budget.
const docRouterPlaybookHits = new Map();
function docRouterPlaybookRateOk(ip) {
  const now = Date.now();
  const hits = (docRouterPlaybookHits.get(ip) || []).filter(t => now - t < 5 * 60 * 1000);
  if (hits.length >= 20) return false;
  hits.push(now);
  docRouterPlaybookHits.set(ip, hits);
  return true;
}

function fallbackPlaybook(checkStatus, defectFlags) {
  const steps = PLAYBOOK_FALLBACK_STEPS[checkStatus] || PLAYBOOK_FALLBACK_STEPS.ACTIVE;
  return {
    narrative: 'Anomaly detected — review required.',
    steps: (defectFlags && defectFlags.length)
      ? ['Identify defects: ' + defectFlags.join(', '), ...steps.slice(0, 3)]
      : steps,
    risk: 55,
    riskRationale: 'Fallback estimate — generative playbook unavailable, using category default.',
    generated: false,
  };
}

app.post('/api/doc-router/playbook', async (req, res) => {
  const {
    checkStatus, documentType, exclusionCode, vendor, invoiceNo,
    amount, client, ref, summary, defectFlags, rawText,
  } = req.body || {};

  if (!checkStatus) {
    return res.status(400).json({ error: 'checkStatus is required.' });
  }

  if (!docRouterPlaybookRateOk(req.ip)) {
    // Degrade, don't 429 — an operator waiting on this is mid-workflow.
    return res.json(fallbackPlaybook(checkStatus, defectFlags));
  }

  const inputSummary = `
checkStatus: ${checkStatus}
documentType: ${documentType || ''}
exclusionCode: ${exclusionCode || ''}
vendor: ${vendor || ''}
invoiceNo: ${invoiceNo || ''}
amount: ${amount || 0}
client: ${client || ''}
ref: ${ref || ''}
summary: ${summary || ''}
defectFlags: ${(defectFlags || []).join(', ')}
${rawText ? '\nOriginal document text (truncated):\n' + String(rawText).slice(0, 6000) : ''}`.trim();

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: 'system', content: 'Respond with ONLY valid JSON. No markdown fences, no preamble, no trailing text.' },
          { role: 'user', content: `${PLAYBOOK_PROMPT}\n\nInput:\n${inputSummary}` },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      console.error('[doc-router/playbook] Groq error:', groqRes.status, await groqRes.text());
      return res.json(fallbackPlaybook(checkStatus, defectFlags));
    }

    const data = await groqRes.json();
    let parsed;
    try {
      parsed = JSON.parse(data.choices[0].message.content);
    } catch (e) {
      console.error('[doc-router/playbook] Bad JSON from model:', data.choices?.[0]?.message?.content);
      return res.json(fallbackPlaybook(checkStatus, defectFlags));
    }

    if (!Array.isArray(parsed.steps) || !parsed.steps.length || typeof parsed.narrative !== 'string') {
      console.error('[doc-router/playbook] Malformed model output, falling back:', parsed);
      return res.json(fallbackPlaybook(checkStatus, defectFlags));
    }

    res.json({
      narrative: parsed.narrative,
      steps: parsed.steps.slice(0, 6),
      risk: Number.isFinite(parsed.risk) ? Math.max(0, Math.min(100, Math.round(parsed.risk))) : 55,
      riskRationale: parsed.riskRationale || '',
      generated: true,
    });
  } catch (err) {
    console.error('[doc-router/playbook] error:', err);
    res.json(fallbackPlaybook(checkStatus, defectFlags));
  }
});