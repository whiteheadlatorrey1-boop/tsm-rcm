#!/usr/bin/env python3
"""
Patch: construction-suite-expansion.html
- Inject TSM_STRATEGIST_SYNC object that serialises all 6 module states
- Auto-saves on tab switches, RFI/CO updates, procurement changes
- Adds "→ Strategist" button in topbar
- Writes to localStorage key 'tsm_expansion_v1' + broadcasts via BroadcastChannel
"""
import pathlib, sys

FILE = pathlib.Path('html/construction-suite/construction-suite-expansion.html')
if not FILE.exists():
    sys.exit(f"ERROR: {FILE} not found. Run from repo root.")

html = FILE.read_text()

# ── 1. Topbar button: inject after back-link ──────────────────────────
OLD_BACK = '<a class="back-link" href="https://tsm-shell.fly.dev/construction-suite/construction-hub.html?v=samplegc">← Hub</a>'
NEW_BACK = (
    '<a class="back-link" href="https://tsm-shell.fly.dev/construction-suite/construction-hub.html?v=samplegc">← Hub</a>\n'
    '    <button id="strategist-sync-btn" onclick="tsmSyncNow()" '
    'style="background:var(--green);border:none;color:var(--bg);font-family:var(--mono);'
    'font-size:10px;font-weight:700;letter-spacing:1.5px;padding:6px 14px;cursor:pointer;'
    'text-transform:uppercase;transition:background .2s;" '
    'title="Push live state to Construction Strategist">'
    '↑ STRATEGIST SYNC</button>\n'
    '    <span id="sync-ts" style="color:var(--text-mute);font-size:9px;letter-spacing:1px;">never synced</span>'
)

if 'strategist-sync-btn' in html:
    print("INFO: Sync button already present — skipping")
else:
    if OLD_BACK in html:
        html = html.replace(OLD_BACK, NEW_BACK, 1)
        print("✓  Strategist Sync button injected into topbar")
    else:
        print("WARN: back-link not found — add sync button manually near topbar")

# ── 2. Inject sync JS before </body> ──────────────────────────────────
SYNC_JS = r"""
<script>
/* ═══════════════════════════════════════════════════════════════
   TSM STRATEGIST SYNC — Construction Suite Expansion
   Serialises live module state → localStorage → Strategist reads
   ═══════════════════════════════════════════════════════════════ */
const TSM_SYNC_KEY = 'tsm_expansion_v1';
const TSM_SYNC_CH  = new BroadcastChannel('tsm_strategist_feed');

function tsmCollectState() {
  const ts = new Date().toISOString();

  /* ── FieldOps ── */
  const kpiEls = document.querySelectorAll('.kpi-box');
  const kpis = [...kpiEls].map(b => ({
    val: b.querySelector('.kpi-val')?.textContent?.trim() || '—',
    lbl: b.querySelector('.kpi-lbl')?.textContent?.trim() || ''
  }));
  const safetyItems = [...document.querySelectorAll('.safety-item')].map(i => ({
    label: i.querySelector('.safety-lbl')?.textContent?.trim() || '',
    checked: i.querySelector('.safety-check')?.checked || false
  }));
  const safetyTotal  = safetyItems.length;
  const safetyDone   = safetyItems.filter(s => s.checked).length;

  /* ── PlanRoom ── */
  const fileRows = [...document.querySelectorAll('.file-row')].map(r => ({
    name:   r.querySelector('.file-name')?.textContent?.trim() || '',
    status: r.querySelector('.file-badge')?.textContent?.trim() || '',
    sub:    r.querySelector('.file-sub')?.textContent?.trim()  || ''
  }));
  const filesRejected  = fileRows.filter(f => /reject/i.test(f.status)).length;
  const filesInReview  = fileRows.filter(f => /review/i.test(f.status)).length;
  const filesApproved  = fileRows.filter(f => /approv/i.test(f.status)).length;

  /* ── Procurement ── */
  const stockRows = [...document.querySelectorAll('.stock-table tbody tr')].map(r => {
    const cells = [...r.querySelectorAll('td')];
    return {
      item:   cells[0]?.textContent?.trim() || '',
      qty:    cells[1]?.textContent?.trim() || '',
      unit:   cells[2]?.textContent?.trim() || '',
      status: r.querySelector('.status-pill')?.textContent?.trim() || ''
    };
  });
  const stockCritical = stockRows.filter(s => /crit/i.test(s.status)).length;
  const stockWarn     = stockRows.filter(s => /warn/i.test(s.status)).length;

  const poCards = [...document.querySelectorAll('.po-card')].map(c => ({
    id:     c.querySelector('.po-id')?.textContent?.trim()     || '',
    vendor: c.querySelector('.po-vendor')?.textContent?.trim() || '',
    meta:   c.querySelector('.po-meta')?.textContent?.trim()   || ''
  }));

  /* ── RFI / Change Orders ── */
  const rfis = [...document.querySelectorAll('.rfi-card')].map(c => ({
    id:      c.querySelector('.rfi-card-id')?.textContent?.trim()      || '',
    subject: c.querySelector('.rfi-card-subject')?.textContent?.trim() || '',
    meta:    c.querySelector('.rfi-card-meta')?.textContent?.trim()    || '',
    status:  c.querySelector('.rfi-status')?.textContent?.trim()       || 'open'
  }));
  const rfisOpen   = rfis.filter(r => /open/i.test(r.status)).length;
  const rfisClosed = rfis.filter(r => /closed/i.test(r.status)).length;

  const cos = [...document.querySelectorAll('.co-card')].map(c => ({
    amount: c.querySelector('.co-amount')?.textContent?.trim() || '',
    meta:   c.querySelector('.co-meta')?.textContent?.trim()   || ''
  }));
  const coTotal = cos.reduce((sum, c) => {
    const n = parseFloat((c.amount || '0').replace(/[^0-9.]/g, ''));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  /* ── Gantt / Schedule ── */
  const ganttTasks = [...document.querySelectorAll('.task-row-sidebar')].map(r => ({
    name: r.querySelector('.task-name')?.textContent?.trim() || '',
    pct:  r.querySelector('.task-pct')?.textContent?.trim()  || '0%'
  }));
  const behindSchedule = ganttTasks.filter(t => {
    const p = parseInt(t.pct);
    return !isNaN(p) && p < 50;
  }).length;

  /* ── Build snapshot ── */
  const snapshot = {
    timestamp: ts,
    source: 'construction-suite-expansion',
    version: 1,
    fieldops: {
      kpis,
      safety: { total: safetyTotal, done: safetyDone, items: safetyItems },
      safetyScore: safetyTotal ? Math.round((safetyDone / safetyTotal) * 100) : null
    },
    planroom: {
      files: fileRows,
      summary: { approved: filesApproved, inReview: filesInReview, rejected: filesRejected }
    },
    procurement: {
      stock: stockRows,
      pos: poCards,
      alerts: { critical: stockCritical, warning: stockWarn }
    },
    rfis: {
      list: rfis,
      summary: { open: rfisOpen, closed: rfisClosed }
    },
    changeOrders: {
      list: cos,
      totalExposure: coTotal
    },
    schedule: {
      tasks: ganttTasks,
      behindCount: behindSchedule
    },
    /* Human-readable digest for BNCA engine */
    digest: buildDigest({ kpis, safetyDone, safetyTotal,
      filesRejected, filesInReview, stockCritical, stockWarn,
      rfisOpen, coTotal, behindSchedule, rfis, cos, stockRows, poCards })
  };

  return snapshot;
}

function buildDigest({ kpis, safetyDone, safetyTotal,
  filesRejected, filesInReview, stockCritical, stockWarn,
  rfisOpen, coTotal, behindSchedule, rfis, cos, stockRows, poCards }) {

  const lines = [
    '=== CONSTRUCTION SUITE EXPANSION — LIVE STATE DIGEST ===',
    `Captured: ${new Date().toLocaleString()}`,
    '',
    '── FIELD OPS ──',
    `Safety checklist: ${safetyDone}/${safetyTotal} items complete (${safetyTotal ? Math.round(safetyDone/safetyTotal*100) : 0}%)`,
    kpis.length ? 'KPIs: ' + kpis.map(k => `${k.lbl} = ${k.val}`).join(' | ') : 'KPIs: none captured',
    '',
    '── PLAN ROOM ──',
    `Documents: ${filesRejected} REJECTED, ${filesInReview} IN REVIEW`,
    '',
    '── PROCUREMENT ──',
    `Stock alerts: ${stockCritical} CRITICAL, ${stockWarn} WARNING`,
  ];
  if (stockCritical > 0) {
    const crits = stockRows.filter(s => /crit/i.test(s.status));
    crits.forEach(c => lines.push(`  CRITICAL: ${c.item} (qty ${c.qty} ${c.unit})`));
  }
  if (poCards.length) {
    lines.push(`Open POs: ${poCards.length}`);
    poCards.forEach(p => lines.push(`  PO ${p.id} — ${p.vendor}: ${p.meta}`));
  }
  lines.push('');
  lines.push('── RFIs ──');
  lines.push(`Open RFIs: ${rfisOpen}`);
  rfis.filter(r => /open/i.test(r.status)).forEach(r =>
    lines.push(`  ${r.id}: ${r.subject} (${r.meta})`));
  lines.push('');
  lines.push('── CHANGE ORDERS ──');
  lines.push(`Total CO exposure: $${coTotal.toLocaleString()}`);
  cos.forEach(c => lines.push(`  ${c.amount} — ${c.meta}`));
  lines.push('');
  lines.push('── SCHEDULE ──');
  lines.push(`Tasks behind schedule (<50% complete): ${behindSchedule}`);
  return lines.join('\n');
}

function tsmSyncNow() {
  const snapshot = tsmCollectState();
  try {
    localStorage.setItem(TSM_SYNC_KEY, JSON.stringify(snapshot));
    TSM_SYNC_CH.postMessage({ type: 'expansion_update', snapshot });
    const ts = document.getElementById('sync-ts');
    if (ts) ts.textContent = 'synced ' + new Date().toLocaleTimeString();
    const btn = document.getElementById('strategist-sync-btn');
    if (btn) {
      btn.textContent = '✓ SYNCED';
      setTimeout(() => { btn.textContent = '↑ STRATEGIST SYNC'; }, 2000);
    }
    console.log('[TSM] Expansion state synced to Strategist:', snapshot.timestamp);
  } catch(e) {
    console.warn('[TSM] Sync failed:', e.message);
  }
}

/* Auto-sync on tab switches */
const _origSwitch = window.switchTab;
window.switchTab = function(tab, el) {
  if (typeof _origSwitch === 'function') _origSwitch(tab, el);
  setTimeout(tsmSyncNow, 300); // give DOM time to update
};

/* Auto-sync on safety checkbox changes */
document.addEventListener('change', e => {
  if (e.target.classList.contains('safety-check')) setTimeout(tsmSyncNow, 100);
});

/* Auto-sync every 90 seconds while page is open */
setInterval(tsmSyncNow, 90000);

/* Initial sync on page load */
window.addEventListener('load', () => setTimeout(tsmSyncNow, 800));

console.log('[TSM] Strategist Sync active — key:', TSM_SYNC_KEY);
</script>
"""

if 'TSM_SYNC_KEY' in html:
    print("INFO: Sync JS already present — skipping")
else:
    html = html.replace('</body>', SYNC_JS + '\n</body>', 1)
    print("✓  Strategist Sync JS injected")

FILE.write_text(html)
print(f"\n✅  {FILE} patched — expansion will now write live state to localStorage['tsm_expansion_v1']")
