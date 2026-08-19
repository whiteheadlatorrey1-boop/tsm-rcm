// ═══════════════════════════════════════════════════════════════════════════
// TSM HC GENERATORS — tsm-hc-generators.js
// Shared module: Appeal Letter Generator + E/M Documentation Check (GATED).
// Load after tsm-node-relay-bridge.js so window.TSMNodeRelay is available.
//
// APPEAL LETTER GENERATOR
//   Real-data-driven: pulls whatever exists in this page's `clientData` +
//   this node's live persisted state (TSMNodeRelay.getState()), sends a
//   structured prompt to the one real AI route (/api/hc/query, message
//   field → Groq), and renders the draft with an explicit human-review
//   disclaimer. Refuses to run if there's no real claim/denial context to
//   appeal — it will not invent a claim.
//
// E/M DOCUMENTATION CHECK — GATED
//   This tool NEVER generates clinical documentation language. Upcoding via
//   AI-written notes is a real fraud-exposure vector (see CO-29/CMS-Audit
//   risk framing already used in hc-billing/hc-compliance). Instead it:
//     1. Requires the physician/coder to enter the ACTUAL visit facts
//        (time, problems addressed, data reviewed, risk) — no free-text
//        narrative generation exists in this tool at all, by design.
//     2. Deterministically scores those facts against the CMS 2021 MDM
//        E/M leveling table (plain arithmetic, not AI).
//     3. If the operator names a level they intend to bill, flags a
//        mismatch against what their own inputs support — it never
//        recommends billing higher than the entered facts support.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.__TSM_HC_GENERATORS__) return;
  window.__TSM_HC_GENERATORS__ = true;

  const COLORS = { accent: '#4ade80', warn: '#fbbf24', bad: '#f87171', panel: '#0a0e14', border: '#1e293b' };

  // ── shared panel chrome ──────────────────────────────────────────────────
  function openPanel(title, bodyHtml) {
    closePanel();
    const wrap = document.createElement('div');
    wrap.id = 'tsm-gen-overlay';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-family:"Courier New",monospace;';
    wrap.innerHTML = `
      <div style="width:min(640px,92vw);max-height:86vh;overflow:auto;background:${COLORS.panel};border:1px solid ${COLORS.border};border-radius:8px;box-shadow:0 0 40px rgba(0,0,0,.5)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ${COLORS.border}">
          <span style="color:${COLORS.accent};font-size:.8rem;font-weight:700;letter-spacing:.08em">${title}</span>
          <button id="tsm-gen-close" style="background:transparent;border:1px solid ${COLORS.border};color:#94a3b8;font-family:inherit;font-size:.62rem;padding:4px 8px;border-radius:3px;cursor:pointer">✕ CLOSE</button>
        </div>
        <div id="tsm-gen-body" style="padding:16px">${bodyHtml}</div>
      </div>`;
    document.body.appendChild(wrap);
    document.getElementById('tsm-gen-close').onclick = closePanel;
    wrap.addEventListener('click', e => { if (e.target === wrap) closePanel(); });
    return document.getElementById('tsm-gen-body');
  }
  function closePanel() {
    const el = document.getElementById('tsm-gen-overlay');
    if (el) el.remove();
  }
  function exportText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }
  // PDF export — same jsPDF CDN build + call pattern already used in
  // construction-suite/compliance-hub.html (exportPDF()). Requires the host
  // page to load https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js;
  // if it isn't loaded, falls back to exportText so the button never dead-ends.
  function exportPdf(filename, title, text) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      exportText(filename.replace(/\.pdf$/i, '.txt'), text);
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(title, 10, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toISOString()}`, 10, 22);
    doc.text('AI-drafted — a human must verify every date/fact and sign before submission to any payer.', 10, 28);
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 36);
    doc.save(filename);
  }
  function readClientData() {
    try { return (typeof window.clientData !== 'undefined' && window.clientData) ? window.clientData : null; }
    catch (e) { return null; }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // APPEAL LETTER GENERATOR
  // ═══════════════════════════════════════════════════════════════════════
  // context is optional: { nodeId, clientData, findings } — used by pages
  // with no page-local `clientData` (e.g. hc-main-strategist, which is a
  // cross-node rollup with no single active claim of its own). When
  // supplied, its `clientData`/`findings` take priority over the page's own
  // globals; when omitted, behavior is identical to before (reads
  // window.clientData directly, refuses if there's nothing real to draft
  // against).
  function appealLetter(context) {
    context = context || {};
    const cd = context.clientData || readClientData();
    const suppliedFindings = context.findings || null;

    if ((!cd || (!cd.claim && !cd.denial)) && !suppliedFindings) {
      openPanel('⚡ APPEAL LETTER GENERATOR', `
        <p style="color:#f87171;font-size:.75rem;line-height:1.6">
          No active claim/denial found. This generator won't draft an appeal against a
          claim that hasn't actually been entered — complete the intake form (or select
          a real live case) first, then run this again.
        </p>`);
      return;
    }

    const summaryText = cd ? JSON.stringify(cd).slice(0, 200) : suppliedFindings.slice(0, 200);
    const body = openPanel('⚡ APPEAL LETTER GENERATOR', `
      <div style="color:#94a3b8;font-size:.68rem;margin-bottom:10px">
        Drafting against: <span style="color:#e2e8f0">${summaryText}</span>
      </div>
      <div id="tsm-gen-status" style="color:${COLORS.accent};font-size:.72rem;margin-bottom:10px">Pulling live node state…</div>
      <pre id="tsm-gen-output" style="white-space:pre-wrap;color:#e2e8f0;font-size:.72rem;line-height:1.6;background:#000;border:1px solid ${COLORS.border};border-radius:4px;padding:12px;min-height:80px"></pre>
      <div id="tsm-gen-actions" style="margin-top:12px;display:none">
        <button id="tsm-gen-export" class="tsm-gen-cta" style="padding:6px 14px;border-radius:3px;font-size:.65rem;font-weight:700;letter-spacing:.06em;cursor:pointer;border:1px solid ${COLORS.accent}55;color:${COLORS.accent};background:rgba(74,222,128,.08);margin-right:8px">📋 EXPORT .TXT</button>
        <button id="tsm-gen-export-pdf" class="tsm-gen-cta" style="padding:6px 14px;border-radius:3px;font-size:.65rem;font-weight:700;letter-spacing:.06em;cursor:pointer;border:1px solid ${COLORS.accent}55;color:${COLORS.accent};background:rgba(74,222,128,.08);margin-right:8px">📄 EXPORT .PDF</button>
        <span style="color:${COLORS.warn};font-size:.62rem">⚠ AI-drafted — a human must verify every date/fact and sign before this is submitted to any payer.</span>
      </div>`);

    const statusEl = () => document.getElementById('tsm-gen-status');
    const outputEl = () => document.getElementById('tsm-gen-output');

    // Prefer the page's own live TSMNodeRelay (node pages); fall back to a
    // direct fetch keyed on context.nodeId (strategist page, which has no
    // single-node relay of its own since it spans all 11).
    const withState = window.TSMNodeRelay
      ? window.TSMNodeRelay.getState()
      : (context.nodeId
          ? fetch('/api/hc/nodes').then(r => r.json()).then(d => (d && d.state && d.state[context.nodeId]) || null).catch(() => null)
          : Promise.resolve(null));

    withState.then(liveState => {
      if (statusEl()) statusEl().textContent = 'Generating draft…';

      const contextLines = [
        'Case data (use ONLY these facts — do not invent dates, names, or numbers not given here):',
        cd ? JSON.stringify(cd) : suppliedFindings
      ];
      if (liveState) contextLines.push('Live node state (for tone/urgency context only): ' + JSON.stringify(liveState).slice(0, 300));

      const message = [
        'Draft a formal payer appeal letter using only the facts provided below.',
        'Do not invent an original submission date, a specific appeal reference number, or any fact not given — use a clear placeholder like [ORIGINAL SUBMISSION DATE] for anything not supplied.',
        'Structure: header block, statement of claim, grounds for appeal, supporting documentation checklist, requested action, closing.',
        contextLines.join('\n')
      ].join('\n\n');

      return fetch('/api/hc/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, system: 'You are a healthcare revenue cycle specialist drafting a payer appeal letter. Be precise, formal, and never fabricate facts not given to you.' })
      }).then(r => r.json());
    }).then(d => {
      const text = (d && (d.output || d.content || d.answer)) || null;
      if (!text) {
        if (statusEl()) { statusEl().textContent = ''; statusEl().style.color = COLORS.bad; statusEl().textContent = 'Generation failed — AI service returned no output. Try again.'; }
        return;
      }
      if (statusEl()) statusEl().remove();
      if (outputEl()) outputEl().textContent = text;
      const actions = document.getElementById('tsm-gen-actions');
      if (actions) actions.style.display = 'block';
      const exportBtn = document.getElementById('tsm-gen-export');
      if (exportBtn) exportBtn.onclick = () => exportText(`appeal-${(cd.claim || 'draft')}-${Date.now()}.txt`, text);
      const exportPdfBtn = document.getElementById('tsm-gen-export-pdf');
      if (exportPdfBtn) exportPdfBtn.onclick = () => exportPdf(
        `appeal-${(cd.claim || 'draft')}-${Date.now()}.pdf`,
        'TSM HEALTHCARE — PAYER APPEAL LETTER (DRAFT)',
        text
      );

      const claimRef = (cd && cd.claim) || '(unspecified)';
      if (window.TSMNodeRelay) {
        window.TSMNodeRelay.push('appeal-drafted', { note: 'Appeal letter drafted for claim ' + claimRef + ' — pending human review' });
      } else if (context.nodeId) {
        // Strategist-page fallback: no page-local TSMNodeRelay exists here
        // (this page spans all 11 nodes), so push directly to the same real
        // endpoint, scoped to whichever node the operator actually selected.
        fetch('/api/hc/nodes/' + encodeURIComponent(context.nodeId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'ONLINE',
            findings: 'Appeal letter drafted for claim ' + claimRef + ' — pending human review',
            source: 'tsm-hc-generators (strategist)',
            relayTrigger: 'appeal-drafted',
            relayedAt: new Date().toISOString()
          })
        }).catch(e => console.error('[tsm-hc-generators] strategist relay push failed:', e));
      }
    }).catch(e => {
      console.error('[tsm-hc-generators] appealLetter failed:', e);
      if (statusEl()) { statusEl().style.color = COLORS.bad; statusEl().textContent = 'Generation failed: ' + e.message; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // E/M DOCUMENTATION CHECK — GATED (no AI text generation, ever)
  // ═══════════════════════════════════════════════════════════════════════
  // CMS 2021 MDM table, collapsed to the three inputs that actually move
  // the level: number/complexity of problems addressed, amount/complexity
  // of data reviewed, and risk of complications/morbidity. Straightforward,
  // auditable arithmetic — not a model call.
  const MDM_LEVELS = ['Straightforward', 'Low', 'Moderate', 'High'];
  const CPT_BY_LEVEL = { 'Straightforward': '99211/99212', 'Low': '99213', 'Moderate': '99214', 'High': '99215' };

  function scoreMDM(problems, data, risk) {
    // Each input is an index 0-3 into MDM_LEVELS. E/M level = the LOWEST of
    // the three (CMS rule: need 2 of 3 elements at a level, but we take the
    // conservative floor so we never suggest documentation supports more
    // than what was actually entered).
    const vals = [problems, data, risk].sort((a, b) => a - b);
    const level = vals[1]; // median of the three = 2-of-3 rule
    return MDM_LEVELS[level];
  }

  function emDocumentation() {
    const body = openPanel('⚕ E/M DOCUMENTATION CHECK — GATED', `
      <div style="color:${COLORS.warn};font-size:.68rem;line-height:1.6;margin-bottom:14px;padding:8px 10px;border:1px solid ${COLORS.warn}44;border-radius:4px;background:rgba(251,191,36,.06)">
        This tool does not write clinical documentation. Enter the ACTUAL facts of the
        visit below; it only scores what you enter against CMS E/M leveling criteria and
        flags any mismatch with an intended billing level. Nothing here is AI-generated.
      </div>
      <label style="display:block;color:#94a3b8;font-size:.65rem;margin-bottom:4px">Problems addressed</label>
      <select id="tsm-em-problems" style="width:100%;margin-bottom:10px;background:#000;color:#e2e8f0;border:1px solid ${COLORS.border};padding:6px;font-family:inherit;font-size:.7rem">
        <option value="0">Minimal (1 self-limited problem)</option>
        <option value="1">Low (2+ self-limited, or 1 stable chronic)</option>
        <option value="2" selected>Moderate (1+ chronic w/ exacerbation, or 2+ stable chronic, or new problem w/ uncertain prognosis)</option>
        <option value="3">High (1+ chronic w/ severe exacerbation, or acute illness posing threat to life/function)</option>
      </select>
      <label style="display:block;color:#94a3b8;font-size:.65rem;margin-bottom:4px">Data reviewed/analyzed</label>
      <select id="tsm-em-data" style="width:100%;margin-bottom:10px;background:#000;color:#e2e8f0;border:1px solid ${COLORS.border};padding:6px;font-family:inherit;font-size:.7rem">
        <option value="0">Minimal or none</option>
        <option value="1">Limited (review of prior notes/tests, or order 1-2 tests)</option>
        <option value="2" selected>Moderate (review of 3+ tests, independent interpretation, or discussion w/ external provider)</option>
        <option value="3">Extensive (review of external records + independent interpretation + discussion, combined)</option>
      </select>
      <label style="display:block;color:#94a3b8;font-size:.65rem;margin-bottom:4px">Risk of complications / morbidity</label>
      <select id="tsm-em-risk" style="width:100%;margin-bottom:10px;background:#000;color:#e2e8f0;border:1px solid ${COLORS.border};padding:6px;font-family:inherit;font-size:.7rem">
        <option value="0">Minimal risk</option>
        <option value="1">Low risk (OTC meds)</option>
        <option value="2" selected>Moderate risk (Rx drug management, minor surgery w/ risk factors)</option>
        <option value="3">High risk (drug requiring intensive monitoring, major surgery, or decision re: hospitalization)</option>
      </select>
      <label style="display:block;color:#94a3b8;font-size:.65rem;margin-bottom:4px">Level you intend to bill (optional — leave blank to just see what's supported)</label>
      <select id="tsm-em-intended" style="width:100%;margin-bottom:14px;background:#000;color:#e2e8f0;border:1px solid ${COLORS.border};padding:6px;font-family:inherit;font-size:.7rem">
        <option value="">— not specified —</option>
        <option value="Straightforward">99211/99212</option>
        <option value="Low">99213</option>
        <option value="Moderate">99214</option>
        <option value="High">99215</option>
      </select>
      <button id="tsm-em-check" style="width:100%;padding:8px;background:${COLORS.accent};color:#000;border:none;border-radius:3px;font-family:inherit;font-size:.72rem;font-weight:700;letter-spacing:.06em;cursor:pointer">CHECK AGAINST ENTERED FACTS</button>
      <div id="tsm-em-result" style="margin-top:14px"></div>
    `);

    document.getElementById('tsm-em-check').onclick = () => {
      const problems = Number(document.getElementById('tsm-em-problems').value);
      const data = Number(document.getElementById('tsm-em-data').value);
      const risk = Number(document.getElementById('tsm-em-risk').value);
      const intended = document.getElementById('tsm-em-intended').value;

      const supportedLevel = scoreMDM(problems, data, risk);
      const supportedCPT = CPT_BY_LEVEL[supportedLevel];
      const resultEl = document.getElementById('tsm-em-result');

      let mismatchHtml = '';
      if (intended && intended !== supportedLevel) {
        const intendedIdx = MDM_LEVELS.indexOf(intended);
        const supportedIdx = MDM_LEVELS.indexOf(supportedLevel);
        if (intendedIdx > supportedIdx) {
          mismatchHtml = `<div style="margin-top:10px;padding:8px 10px;border:1px solid ${COLORS.bad}55;border-radius:4px;background:rgba(248,113,113,.08);color:${COLORS.bad};font-size:.7rem;line-height:1.6">
            ⚠ FLAG: intended billing level (${CPT_BY_LEVEL[intended]}) is HIGHER than what the entered facts support (${supportedCPT}).
            Billing above documented support is an upcoding exposure. Either document additional MDM elements that actually occurred, or bill at ${supportedCPT}.
          </div>`;
        } else {
          mismatchHtml = `<div style="margin-top:10px;padding:8px 10px;border:1px solid ${COLORS.border};border-radius:4px;color:#94a3b8;font-size:.7rem;line-height:1.6">
            Intended level (${CPT_BY_LEVEL[intended]}) is at or below what's supported (${supportedCPT}) — no upcoding flag, though under-coding leaves recoverable revenue unbilled.
          </div>`;
        }
      }

      resultEl.innerHTML = `
        <div style="padding:10px 12px;border:1px solid ${COLORS.accent}55;border-radius:4px;background:rgba(74,222,128,.06)">
          <div style="color:#94a3b8;font-size:.6rem;letter-spacing:.08em;margin-bottom:4px">SUPPORTED BY ENTERED FACTS (2-of-3 MDM rule)</div>
          <div style="color:${COLORS.accent};font-size:.85rem;font-weight:700">${supportedLevel} MDM → ${supportedCPT}</div>
        </div>
        ${mismatchHtml}`;

      if (window.TSMNodeRelay) {
        window.TSMNodeRelay.push('em-check-run', { note: 'E/M check run — supported level ' + supportedCPT + (intended ? ', intended ' + CPT_BY_LEVEL[intended] : '') });
      }
    };
  }

  // ── deadline countdown utility ───────────────────────────────────────────
  // Computes real days-remaining from an actual date string, instead of the
  // old pattern of dropping the countdown once real intake data replaced the
  // hardcoded demo "48hr" widget. Pure date math — no AI, nothing fabricated.
  //
  //   deadlineInfo(dateStr) -> {
  //     valid: boolean,
  //     daysLeft: number,      // negative if overdue
  //     label: string,         // e.g. "42 DAYS", "DUE TODAY", "3 DAYS OVERDUE"
  //     severity: 'ok'|'warn'|'bad'|'overdue'
  //   }
  //   deadlineBadgeHtml(dateStr, fallbackText) -> ready-to-inject HTML string
  //     matching the existing urgent-task countdown chip markup. If dateStr
  //     is missing/invalid, falls back to fallbackText (or a neutral "action
  //     required" chip) rather than fabricating a number.
  function deadlineInfo(dateStr) {
    if (!dateStr) return { valid: false, daysLeft: null, label: '', severity: 'ok' };
    const target = new Date(dateStr + 'T00:00:00');
    if (isNaN(target.getTime())) return { valid: false, daysLeft: null, label: '', severity: 'ok' };
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.round((target - todayMidnight) / msPerDay);

    let label, severity;
    if (daysLeft < 0) {
      label = Math.abs(daysLeft) + (Math.abs(daysLeft) === 1 ? ' DAY OVERDUE' : ' DAYS OVERDUE');
      severity = 'overdue';
    } else if (daysLeft === 0) {
      label = 'DUE TODAY';
      severity = 'bad';
    } else if (daysLeft === 1) {
      label = '1 DAY';
      severity = 'bad';
    } else if (daysLeft <= 7) {
      label = daysLeft + ' DAYS';
      severity = 'bad';
    } else if (daysLeft <= 14) {
      label = daysLeft + ' DAYS';
      severity = 'warn';
    } else {
      label = daysLeft + ' DAYS';
      severity = 'ok';
    }
    return { valid: true, daysLeft, label, severity };
  }

  function deadlineBadgeHtml(dateStr, fallbackText) {
    const info = deadlineInfo(dateStr);
    const sevColor = { ok: COLORS.accent, warn: COLORS.warn, bad: COLORS.bad, overdue: COLORS.bad }[info.severity] || COLORS.warn;
    if (!info.valid) {
      return '<div style="font-size:9px;color:#556655;padding:5px 8px;margin-bottom:6px">'
        + (fallbackText || 'No deadline date on file — enter one in intake to track it.') + '</div>';
    }
    const sub = info.severity === 'overdue'
      ? 'past the appeal deadline — write-off risk'
      : 'appeal deadline — act before it closes';
    return '<div style="display:flex;align-items:center;gap:8px;background:#0a0000;border:1px solid #3a0000;border-radius:3px;padding:5px 8px;margin-bottom:6px">'
      + '<span style="font-size:16px;font-weight:700;color:' + sevColor + '">' + info.label + '</span>'
      + '<span style="font-size:9px;color:#cc9999">' + sub + '</span>'
      + '</div>';
  }

  window.TSMGenerators = { appealLetter, emDocumentation, deadlineInfo, deadlineBadgeHtml };
})();
