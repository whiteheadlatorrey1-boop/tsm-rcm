/* ======================================================================
   BPO DOCUMENT ENGINE CHAIN
   html/shared/runtime/bpo-doc-engine-chain.js  (proposed location)
   ------------------------------------------------------------------
   WHAT THIS IS
   A 3-stage sequential AI reasoning chain for BPO work-item documents,
   modeled directly on hc-denial-war-room.html's relay() / groqStreamModel()
   pattern (5 sequential /api/hc/stream calls, each stage's output feeding
   the next). This does the same thing for BPO, in 3 stages instead of 5,
   because BPO doesn't have HC's document-heavy claim-adjudication shape --
   it has a document, a root cause, and an operational recovery action.

   IT DOES NOT DUPLICATE:
   - Extraction: reuses extractFile() / extractBinaryDoc() already in
     tsm-doc-search-multi.html (pdf-parse / mammoth / xlsx server-side).
   - Classification: reuses classifyExtraction() -> /api/doc-router/classify
     exactly as-is. That result IS this chain's "Document Intel" stage --
     no new call, no new endpoint, just reused as input to Stage 2 below.
   - Backend: no new route. Every stage below calls the existing generic
     /api/hc/stream endpoint (server.js ~line 1761), which is not actually
     HC-specific -- it just proxies {model, sys, user, maxTok} to Groq and
     streams the response. Same endpoint HC's 5 engines already use.
   - Output contract: the final stage writes an object shaped EXACTLY like
     bpo-strategist.html's `generatedRec` (confidence, recommendedActions
     [{text, owner}], dataSources [{name, weight}], reasoning [{key, val}],
     escalationTriggers []) -- see bpo-strategist.html lines ~1242-1260 for
     the reference shape this mirrors. Nothing in bpo-strategist.html needs
     to change to consume this; it already knows how to render this object,
     it just currently only gets it from Firing the strategy engine
     interactively, not from an automated pre-analysis chain.

   USAGE (from tsm-doc-search-multi.html, after classifyExtraction() runs
   for a document routed to the 'bpo' vertical):

     const classification = await classifyExtraction(file.name, extraction);
     if (classification.primaryVertical === 'bpo' || (classification.verticals||[]).includes('bpo')) {
       const chainResult = await runBpoDocEngineChain({
         fileName: file.name,
         docText: extraction.type === 'text' ? extraction.value : '',
         classification
       }, {
         onStage: (stageName, statusText) => console.log('[bpo-chain]', stageName, statusText)
       });
       writeBpoChainRelay(chainResult, classification, file.name);
     }

   After that, bpo-strategist.html's existing loadRelay() / hydrate path
   picks up TSM_BPO_WAR_RELAY same as it does today from the war room --
   the only change is that a pre-computed recommendation now rides along
   with it, so the strategist can render immediately instead of requiring
   a manual "fire strategy engine" click. (Manual fire should stay
   available as a re-run/override -- this is a pre-fill, not a replacement.)
   ====================================================================== */

/* -- STAGE PROMPTS ------------------------------------------------------ */

const BPO_ROOT_CAUSE_PROMPT = `You are a BPO operations root-cause analyst.
You are given a document that has already been classified (vertical, document
type, vendor, amount, entities) and its extracted text. Your job is ONLY to
identify the underlying operational root cause -- do not repeat the
classification, do not propose remediation yet.

Consider BPO-specific root cause categories: staffing/capacity shortfall,
vendor/subcontractor failure, client-side data or input defect, SLA
definition ambiguity, process/handoff gap between stages, system/tooling
outage, or scope/contract mismatch.

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "rootCauseCategory": "<one of: staffing | vendor | client_data | sla_definition | process_gap | system_outage | scope_mismatch | other>",
  "rootCauseSummary": "<1-2 sentence plain-language explanation>",
  "evidence": ["<short quote or reference from the document text supporting this>", "..."],
  "confidence": <0-1 float, your own confidence in this root-cause read>
}`;

const BPO_IMPACT_RECOVERY_PROMPT = `You are a BPO operations impact and recovery
planner. You are given: (1) a document classification, (2) a root-cause
analysis already completed by a prior stage. Do not re-derive root cause --
take it as given. Your job is to size the operational/financial impact and
propose a recovery action scoped to a BPO work-item lifecycle (the stages a
work-item moves through are: uploaded, ocr, classified, extracted, validated,
created, assigned, in_progress, qa, delivered, billed, closed).

Respond with ONLY valid JSON, no markdown fences, no preamble:
{
  "impactSummary": "<1-2 sentences on SLA / revenue / client-relationship exposure>",
  "exposureEstimate": "<dollar figure as string if derivable from the document/amount field, else null>",
  "recommendedStage": "<which STAGE_ORDER value this work-item should be routed/held at next>",
  "recommendedActions": [
    { "text": "<concrete action>", "owner": "<role, e.g. 'Operations Director'>" }
  ],
  "escalationTriggers": ["<condition that would require executive escalation, if any>"]
}`;

const BPO_HANDOFF_PROMPT = `You are formatting a final strategist handoff record
for a BPO work-item. You are given the document classification, the root-cause
analysis, and the impact/recovery analysis from prior stages. Combine them
into a single recommendation object. Do not introduce new facts -- synthesize
only what you were given. If a prior stage's confidence was low, reflect that
in the combined confidence rather than defaulting to a high number.

Respond with ONLY valid JSON, no markdown fences, no preamble, matching this
exact shape (used directly by the BPO Strategist UI):
{
  "confidence": <integer 0-100>,
  "recommendedActions": [ { "text": "<action>", "owner": "<role>" } ],
  "dataSources": [ { "name": "<source>", "weight": "HIGH|MED|LOW" } ],
  "reasoning": [ { "key": "<short label>", "val": "<explanation>" } ],
  "escalationTriggers": ["<trigger>", "..."]
}`;

/* -- GENERIC NON-STREAMING CALL TO THE EXISTING /api/hc/stream ROUTE ----
   HC's groqStreamModel() streams token-by-token for a live typing effect
   in the war room UI. This chain runs headless (feeding stage N's output
   into stage N+1's prompt), so it collects the full stream and returns
   one string rather than wiring up onChunk -- same endpoint, simpler
   consumption. If a token-by-token UI is wanted later for this chain too,
   swap this for the existing groqStreamModel() unmodified. */
const BPO_RETRYABLE_STATUSES = [429, 500, 502, 503];
const BPO_MAX_RETRIES = 2; // total up to 3 attempts, matching groqChat's retry count in server.js
const BPO_RETRY_DELAY_MS = 3000; // fallback backoff for non-rate-limit transient errors (500/502/503 without a stated wait time)
const BPO_MAX_RETRY_DELAY_MS = 20000; // safety cap so a malformed/huge stated wait can't hang the chain indefinitely

// Groq's TPM (tokens-per-minute) rate-limit errors include the exact wait
// time needed, e.g.: "Please try again in 14.257s." A flat 3s backoff (fine
// for ordinary 502/503 blips) is NOT long enough for this specific error --
// confirmed live: Groq returned "Limit 8000, Used 7987 ... try again in
// 14.257s" and the flat-3s retry still failed on all 3 attempts because
// 2 retries x 3s = 6s < the 14.257s Groq actually required. Parsing Groq's
// own number and waiting that long (plus a small buffer) fixes this
// specific, confirmed failure mode instead of guessing at a bigger flat
// delay that would also slow down retries for OTHER transient errors that
// don't need nearly that long.
function bpoParseRetryDelayMs(errMsg) {
  if (!errMsg) return BPO_RETRY_DELAY_MS;
  const match = String(errMsg).match(/try again in\s+([\d.]+)\s*s/i);
  if (!match) return BPO_RETRY_DELAY_MS;
  const seconds = parseFloat(match[1]);
  if (!Number.isFinite(seconds) || seconds <= 0) return BPO_RETRY_DELAY_MS;
  const bufferedMs = Math.ceil(seconds * 1000) + 500; // +500ms buffer past Groq's own stated minimum
  return Math.min(bufferedMs, BPO_MAX_RETRY_DELAY_MS);
}

async function bpoEngineCall(sys, user, { maxTok = 700, timeoutMs = 30000 } = {}) {
  for (let attempt = 0; attempt <= BPO_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const watchdog = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/hc/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sys, user, maxTok }),
        signal: controller.signal
      });
      if (!res.ok) {
        let msg = 'Server error ' + res.status;
        try {
          const e = await res.json();
          if (typeof e.error === 'string') msg = e.error;
          else if (e.error && e.error.message) msg = e.error.message;
        } catch (_) {}
        if (BPO_RETRYABLE_STATUSES.includes(res.status) && attempt < BPO_MAX_RETRIES) {
          clearTimeout(watchdog);
          const delay = bpoParseRetryDelayMs(msg);
          console.warn('[bpo-doc-engine] /api/hc/stream returned ' + res.status + ' (attempt ' + (attempt + 1) + '/' + (BPO_MAX_RETRIES + 1) + '): ' + msg + ' -- retrying in ' + delay + 'ms');
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '', full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          const data = line.replace(/^data: /, '').trim();
          if (data === '[DONE]') return full;
          if (!data || data[0] === ':') continue;
          try {
            const j = JSON.parse(data);
            const tok = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
            if (tok) full += tok;
          } catch (_) {}
        }
      }
      return full;
    } finally {
      clearTimeout(watchdog);
    }
  }
  // Unreachable in practice: the loop above either returns on success or
  // throws on a non-retryable/exhausted-retries failure. Present only to
  // satisfy control-flow analysis.
  throw new Error('bpoEngineCall: retry loop exited without result');
}

function bpoParseJsonBlock(raw, stageName) {
  try {
    const match = raw.replace(/```json|```/g, '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no JSON object found');
    return JSON.parse(match[0]);
  } catch (e) {
    console.warn('[bpo-doc-engine] Stage "' + stageName + '" returned unparseable JSON:', raw);
    return null;
  }
}

/* -- ORCHESTRATOR ------------------------------------------------------- */
/**
 * Runs the 3-stage BPO reasoning chain. Stage 1 (Document Intel) is NOT
 * re-run here -- it's passed in as `classification`, the result you already
 * have from classifyExtraction(). This function only runs the two new
 * stages (Root Cause, Impact/Recovery) plus the Handoff formatting stage.
 *
 * @param {Object} input
 * @param {string} input.fileName
 * @param {string} input.docText - raw extracted text (may be empty for images)
 * @param {Object} input.classification - result of classifyExtraction()
 * @param {Object} [opts]
 * @param {(stageName: string, status: string) => void} [opts.onStage] - progress callback
 * @returns {Promise<{rootCause: Object|null, impact: Object|null, handoff: Object|null, failedStage: string|null}>}
 */
async function runBpoDocEngineChain(input, opts = {}) {
  const onStage = opts.onStage || (() => {});
  const { fileName, docText, classification } = input;
  const docExcerpt = String(docText || '').slice(0, 6000);

  // -- Stage 2: Root Cause --
  onStage('root_cause', 'running');
  let rootCause = null;
  try {
    const raw = await bpoEngineCall(
      BPO_ROOT_CAUSE_PROMPT,
      `Filename: ${fileName}\n\nClassification:\n${JSON.stringify(classification)}\n\nDocument text:\n${docExcerpt}`
    );
    rootCause = bpoParseJsonBlock(raw, 'root_cause');
  } catch (e) {
    onStage('root_cause', 'error: ' + e.message);
    return { rootCause: null, impact: null, handoff: null, failedStage: 'root_cause' };
  }
  onStage('root_cause', rootCause ? 'done' : 'unparseable');

  // -- Stage 3: Impact / Recovery --
  onStage('impact_recovery', 'running');
  let impact = null;
  try {
    const raw = await bpoEngineCall(
      BPO_IMPACT_RECOVERY_PROMPT,
      `Classification:\n${JSON.stringify(classification)}\n\nRoot cause analysis:\n${JSON.stringify(rootCause)}`
    );
    impact = bpoParseJsonBlock(raw, 'impact_recovery');
  } catch (e) {
    onStage('impact_recovery', 'error: ' + e.message);
    return { rootCause, impact: null, handoff: null, failedStage: 'impact_recovery' };
  }
  onStage('impact_recovery', impact ? 'done' : 'unparseable');

  // -- Stage 4: Handoff formatting --
  onStage('handoff', 'running');
  let handoff = null;
  try {
    const raw = await bpoEngineCall(
      BPO_HANDOFF_PROMPT,
      `Classification:\n${JSON.stringify(classification)}\n\nRoot cause:\n${JSON.stringify(rootCause)}\n\nImpact/recovery:\n${JSON.stringify(impact)}`
    );
    handoff = bpoParseJsonBlock(raw, 'handoff');
  } catch (e) {
    onStage('handoff', 'error: ' + e.message);
    return { rootCause, impact, handoff: null, failedStage: 'handoff' };
  }

  // Same honesty convention as bpo-strategist.html's own parse path:
  // never let a missing confidence field silently become a hardcoded 91
  // without at least flagging it.
  if (handoff && (handoff.confidence === undefined || handoff.confidence === null)) {
    console.warn('[bpo-doc-engine] Handoff stage omitted confidence -- defaulting to 60 (lower than the strategist UI\'s manual-fire default of 91, since this ran unattended).');
    handoff.confidence = 60;
    handoff.confidenceDefaulted = true;
  }

  onStage('handoff', handoff ? 'done' : 'unparseable');
  return { rootCause, impact, handoff, failedStage: null };
}

/* -- RELAY WRITER ------------------------------------------------------- */
/**
 * Writes the chain result into TSM_BPO_WAR_RELAY in a shape bpo-strategist.html
 * already reads on load (see bpo-strategist.html's loadRelay(), which reads
 * sessionStorage/localStorage 'TSM_BPO_WAR_RELAY'). This does NOT touch
 * TSM_BPO_STRAT_RELAY -- that key is owned by the strategist page itself
 * (storeStratRelay(), fired when a human reviews/fires from that page).
 * This only pre-seeds the war-room-side relay with a `preAnalysis` block;
 * the strategist's own "fire strategy engine" flow can still run normally
 * and will overwrite `generatedRec` with a fresh interactive result if the
 * user chooses to re-run rather than accept the pre-analysis.
 */
function writeBpoChainRelay(chainResult, classification, fileName) {
  const key = 'TSM_BPO_WAR_RELAY';
  let existing = {};
  try {
    existing = JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || '{}');
  } catch (_) {}

  existing.preAnalysis = {
    source: 'bpo-doc-engine-chain',
    fileName,
    classification,
    rootCause: chainResult.rootCause,
    impact: chainResult.impact,
    recommendation: chainResult.handoff,   // same shape as generatedRec
    failedStage: chainResult.failedStage,
    generatedAt: new Date().toISOString()
  };

  try {
    sessionStorage.setItem(key, JSON.stringify(existing));
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.warn('[bpo-doc-engine] Failed to write relay (non-fatal):', e.message);
  }
}
