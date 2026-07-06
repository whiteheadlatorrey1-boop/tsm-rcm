#!/usr/bin/env python3
"""
apply_l1_copilot_routes.py

Patches server.js with:
  - SP.l1support system prompt (Senior Network & Systems Engineer)
  - POST /api/l1-copilot/analyze
  - POST /api/l1-copilot/vendor
  - POST /api/l1-copilot/resolution
  - POST /api/l1-copilot/escalation

Follows the repo's established edit pattern: backs up server.js first,
uses assert-guarded string replacement (no regex/sed across the whole
file), and is idempotent — safe to re-run if it already applied.

Run from the repo root:
    python3 apply_l1_copilot_routes.py
"""

import re
import shutil
import sys
from datetime import datetime, timezone

SERVER_PATH = "server.js"


def backup(path):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
    backup_path = f"{path}.bak.l1copilot.{ts}"
    shutil.copyfile(path, backup_path)
    print(f"  backed up {path} -> {backup_path}")
    return backup_path


SP_L1SUPPORT_ENTRY = (
    "  l1support: 'You are a Senior Network and Systems Engineer acting as the "
    "decision-making core of TSM L1 Ticket Copilot, a desktop/network support "
    "triage tool. You have 15+ years of enterprise IT experience across "
    "Windows/macOS endpoint management, Active Directory/Entra ID, DNS/DHCP, "
    "VLAN and routing, firewall/ACL policy, VPN and SD-WAN, virtualization, "
    "Microsoft 365/Azure, and OEM hardware (Dell, HP, Lenovo, Cisco, Meraki, "
    "Fortinet). Triage every ticket in OSI-layer order — physical/hardware "
    "first, then link/network (VLAN, switchport, DHCP, DNS), then "
    "transport/session (VPN, firewall, auth/SSO/MFA), then application — and "
    "do not skip layers. Distinguish clearly between an L1-actionable fix, a "
    "fix that needs elevated/L2 access, and a fix that needs vendor hardware "
    "service, and say which one applies and why. When recommending "
    "escalation, name the correct team (Desktop, Network, Server, Azure, "
    "O365, Security, Application, or Vendor) based on where in the stack the "
    "root cause actually sits, not just ticket category. Be precise, "
    "operational, and quantify confidence and risk where you can. No filler, "
    "no preamble, no restating the question back.',\n"
)

SP_ANCHOR = "};\n\n// ── GLOBAL STATE"

ROUTES_ANCHOR = "app.post('/api/schools/query'"

ROUTES_BLOCK = """app.post('/api/l1-copilot/analyze', async (req, res) => {
  const { ticket, maxTokens } = req.body || {};
  if (!ticket || !ticket.description) return res.status(400).json({ ok: false, error: 'ticket.description required' });
  const summary = JSON.stringify({
    incident: ticket.incident, priority: ticket.priority, requester: ticket.requester,
    department: ticket.department, asset: ticket.asset, manufacturer: ticket.manufacturer,
    model: ticket.model, warranty: ticket.warranty
  }, null, 2);
  const prompt = `Ticket metadata:\\n${summary}\\n\\nTicket description:\\n${ticket.description}\\n\\n` +
    `Analyze this ticket and return ONLY valid JSON, no markdown, no backticks, in exactly this shape:\\n` +
    `{"issue_summary":"one sentence","likely_causes":["cause 1","cause 2"],"confidence":0-100,` +
    `"affected_system":"short label","business_impact":"short label","severity":"Low|Medium|High|Critical",` +
    `"recommended_path":"the single next diagnostic or remediation step, and why"}`;
  try {
    const raw = await groqChat(SP.l1support, prompt, maxTokens || 900);
    const analysis = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.json({ ok: true, analysis, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT ANALYZE ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/vendor', async (req, res) => {
  const { manufacturer, serviceTag, warranty, issueSummary, maxTokens } = req.body || {};
  if (!manufacturer) return res.status(400).json({ ok: false, error: 'manufacturer required' });
  const prompt = `Manufacturer: ${manufacturer}\\nService tag / express service code: ${serviceTag || 'not provided'}\\n` +
    `Warranty status: ${warranty || 'unknown'}\\nIssue summary: ${issueSummary || 'not provided'}\\n\\n` +
    `Recommend which ${manufacturer} support tier to engage (e.g. ProSupport vs ProSupport Plus vs Basic/standard warranty), ` +
    `exactly what information the technician should have ready before contacting them (service tag, diagnostic codes, ` +
    `error logs, etc.), and whether this looks like a case for phone support, chat, or an on-site dispatch. Be concise and operational.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 700);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT VENDOR ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/resolution', async (req, res) => {
  const { ticket, analysis, notes, maxTokens } = req.body || {};
  if (!ticket) return res.status(400).json({ ok: false, error: 'ticket required' });
  const prompt = `Ticket description:\\n${ticket}\\n\\n` +
    (analysis ? `AI analysis on file:\\n${JSON.stringify(analysis, null, 2)}\\n\\n` : '') +
    (notes ? `Technician notes / troubleshooting steps performed:\\n${notes}\\n\\n` : '') +
    `Write a resolution record ready to paste into ServiceNow, with these exact section headers on their own lines: ` +
    `Problem / Cause / Actions Taken / Resolution / Validation / Next Steps. Be factual — only state actions that are ` +
    `reflected in the notes above; do not invent steps that weren't performed.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 900);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT RESOLUTION ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/l1-copilot/escalation', async (req, res) => {
  const { ticket, analysis, reason, evidence, recommendedTeam, maxTokens } = req.body || {};
  if (!ticket) return res.status(400).json({ ok: false, error: 'ticket required' });
  const prompt = `Ticket description:\\n${ticket}\\n\\n` +
    (analysis ? `AI analysis on file:\\n${JSON.stringify(analysis, null, 2)}\\n\\n` : '') +
    `Escalation reason given by technician: ${reason || 'not specified'}\\n` +
    `Evidence attached: ${evidence || 'none noted'}\\n` +
    `Technician-selected team: ${recommendedTeam || 'not selected'}\\n\\n` +
    `Write a short escalation package for the receiving L2/vendor team: confirm or correct the recommended team based ` +
    `on where the root cause actually sits, summarize what's been ruled out at L1, state the business impact, and list ` +
    `exactly what the receiving team needs to pick this up without re-doing L1 steps.`;
  try {
    const answer = await groqChat(SP.l1support, prompt, maxTokens || 800);
    return res.json({ ok: true, answer, createdAt: new Date().toISOString() });
  } catch (e) {
    console.error('L1 COPILOT ESCALATION ERROR:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

"""


def main():
    try:
        with open(SERVER_PATH, "r", encoding="utf-8") as f:
            src = f.read()
    except FileNotFoundError:
        print(f"ERROR: {SERVER_PATH} not found. Run this from the repo root.")
        sys.exit(1)

    changed = False

    # ── 1) SP.l1support ─────────────────────────────────────────────────
    if "l1support:" in src:
        print("  SP.l1support already present — skipping (idempotent).")
    else:
        count = src.count(SP_ANCHOR)
        assert count == 1, f"expected SP_ANCHOR exactly once, found {count} — server.js may not match expected shape"
        backup(SERVER_PATH)
        # the SP object's last existing entry has no trailing comma, so add
        # one before splicing in the new property
        src = src.replace(SP_ANCHOR, ",\n" + SP_L1SUPPORT_ENTRY + SP_ANCHOR, 1)
        print("  inserted SP.l1support prompt")
        changed = True

    # ── 2) Routes ────────────────────────────────────────────────────────
    if "/api/l1-copilot/analyze" in src:
        print("  /api/l1-copilot/analyze already present — skipping routes (idempotent).")
    else:
        count = src.count(ROUTES_ANCHOR)
        assert count == 1, f"expected ROUTES_ANCHOR exactly once, found {count} — pick a different anchor"
        if not changed:
            backup(SERVER_PATH)
        src = src.replace(ROUTES_ANCHOR, ROUTES_BLOCK + ROUTES_ANCHOR, 1)
        print("  inserted 4 L1 Copilot routes (analyze / vendor / resolution / escalation)")
        changed = True

    if not changed:
        print("\nNothing to do — server.js already has SP.l1support and the L1 Copilot routes.")
        return

    with open(SERVER_PATH, "w", encoding="utf-8") as f:
        f.write(src)
    print(f"\nwrote {SERVER_PATH}")
    print("\nDone. Restart your server (e.g. `npm start` / your Fly.io deploy) to pick up the new routes.")
    print("\nReminder: SP.l1Assistant / /api/l1-copilot/assistant (from apply-l1-assistant.js) is untouched.")
    print("Point that route at SP.l1support too if you want the widget's chat to share this same voice.")


if __name__ == "__main__":
    main()