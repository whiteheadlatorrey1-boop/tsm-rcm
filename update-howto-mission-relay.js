#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'html/hotelops/hotelops-howto.html');

if (!fs.existsSync(FILE)) {
  console.error(`ERROR: ${FILE} not found. Run this from the repo root.`);
  process.exit(1);
}

let src = fs.readFileSync(FILE, 'utf8');
const original = src;

function assertCount(str, needle, expected, label) {
  const count = str.split(needle).length - 1;
  if (count !== expected) {
    console.error(`ABORT: expected ${expected} occurrence(s) of "${label}", found ${count}.`);
    console.error('No changes written. Paste the current section back so this can be adjusted.');
    process.exit(1);
  }
}

const INCIDENTS_OLD = `  <div class="section" id="incidents">
    <h2>Incident Center <span class="tag">sidebar → Incident Center</span></h2>
    <p>Open guest/property incidents, with anything past its response-time SLA flagged for immediate duty-manager escalation.</p>
  </div>`;
assertCount(src, INCIDENTS_OLD, 1, 'Incident Center section');
const INCIDENTS_NEW = `  <div class="section" id="incidents">
    <h2>Incident Center <span class="tag">sidebar → Incident Center</span></h2>
    <p>Open guest/property incidents, with anything past its response-time SLA flagged for immediate duty-manager escalation.</p>
    <div class="how">Escalations created upstream (Strategist or Sentinel) show up here automatically once they touch this property — tagged <b>LIVE MISSION</b> with their current stage. There's no "create mission" button in the War Room itself; this panel is a live read of what's already been escalated elsewhere.</div>
  </div>`;
src = src.replace(INCIDENTS_OLD, INCIDENTS_NEW);
console.log('✔ Updated Incident Center section.');

const COMPLIANCE_OLD = `  <div class="section" id="compliance">
    <h2>Compliance <span class="tag">sidebar → Compliance</span></h2>
    <p>Items due within the compliance window — I-9 re-verification, licensing, fire-safety and health-permit renewals — so nothing lapses unnoticed.</p>
  </div>`;
assertCount(src, COMPLIANCE_OLD, 1, 'Compliance section');
const COMPLIANCE_NEW = `  <div class="section" id="compliance">
    <h2>Compliance <span class="tag">sidebar → Compliance</span></h2>
    <p>Items due within the compliance window — I-9 re-verification, licensing, fire-safety and health-permit renewals — so nothing lapses unnoticed.</p>
    <div class="how">Any compliance-classified mission already open elsewhere in the system appears here too, tagged <b>LIVE</b>, so this list reflects both locally-tracked items and anything already being worked upstream.</div>
  </div>`;
src = src.replace(COMPLIANCE_OLD, COMPLIANCE_NEW);
console.log('✔ Updated Compliance section.');

const RELAY_OLD = `      <li><b>RELAY TO STRATEGIST →</b> — pushes the current War Room snapshot (KPIs, anomalies, AI notes) to the HotelOps Strategist, which is what the Executive Portal ultimately rolls up.</li>
    </ul>`;
assertCount(src, RELAY_OLD, 1, 'RELAY TO STRATEGIST bullet');
const RELAY_NEW = `      <li><b>RELAY TO STRATEGIST →</b> — pushes the current War Room snapshot (KPIs, anomalies, AI notes) to the HotelOps Strategist, which is what the Executive Portal ultimately rolls up. The payload is sealed with a SHA-256 integrity check before it's sent, so Strategist, Executive Portal, and Sentinel Center can all detect if it was altered in transit.</li>
      <li><b>Sentinel Center</b> — the same relay push carries a ready-made anomalies array (maintenance SLA breaches and similar signals) in the format Sentinel Center expects, so cross-property severity rolls up there without any separate setup.</li>
    </ul>`;
src = src.replace(RELAY_OLD, RELAY_NEW);
console.log('✔ Updated Data & Relay Flow section.');

if (src === original) {
  console.log('\nNo changes needed — file already fully updated.');
  process.exit(0);
}

fs.writeFileSync(FILE + '.bak', original, 'utf8');
fs.writeFileSync(FILE, src, 'utf8');

console.log(`\nDone. Backup saved to ${FILE}.bak`);