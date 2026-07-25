#!/usr/bin/env python3
"""
Applies the HIPAA (Healthcare) and ISO/SOC2 (BPO) governance content fixes
directly, without relying on a git patch. Run from repo root:

    python3 apply-governance-fix.py

Safe to re-run: each edit checks the target string exists and that the
insertion hasn't already happened before touching the file.
"""
import sys

HIPAA_OLD = '''              <div class="dl-title">Stark Law Vendor Review — OIG Watchlist</div>
              <div class="dl-sub">2 vendors flagged · legal review in progress</div>
            </div>
            <div class="dl-exposure" style="color:var(--muted)">Ongoing</div>
          </div>
        </div>
      </div>
    </div>

  </div>'''

HIPAA_NEW = '''              <div class="dl-title">Stark Law Vendor Review — OIG Watchlist</div>
              <div class="dl-sub">2 vendors flagged · legal review in progress</div>
            </div>
            <div class="dl-exposure" style="color:var(--muted)">Ongoing</div>
          </div>
          <div class="deadline-item">
            <div class="dl-countdown dlc-ok">
              <div class="dl-days">60</div>
              <div class="dl-unit">days</div>
            </div>
            <div class="dl-info">
              <div class="dl-title">HIPAA Security Risk Assessment — Annual Review</div>
              <div class="dl-sub">Privacy Officer scheduling audit · Breach Notification Rule log clean</div>
            </div>
            <div class="dl-exposure" style="color:var(--muted)">Scheduled</div>
          </div>
        </div>
      </div>
    </div>

  </div>'''

GOV_OLD = '''    <div class="gov-item">
      <div class="gov-item-label">EXCEPTION HANDLING</div>
      <div class="gov-item-val warn" id="govException">MONITORED</div>
    </div>
  </div>'''

GOV_NEW = '''    <div class="gov-item">
      <div class="gov-item-label">EXCEPTION HANDLING</div>
      <div class="gov-item-val warn" id="govException">MONITORED</div>
    </div>
    <div class="gov-item">
      <div class="gov-item-label">CERTIFICATION STATUS</div>
      <div class="gov-item-val ok">ISO 27001 · SOC2 (SOC 2) TYPE II — ACTIVE</div>
    </div>
  </div>'''

def apply_fix(path, old, new, label):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    if new in content:
        print(f"[SKIP] {label}: already applied in {path}")
        return True
    if old not in content:
        print(f"[FAIL] {label}: target string not found in {path} — file may have changed. Manual fix needed.")
        return False

    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK]   {label}: applied to {path}")
    return True

results = []
results.append(apply_fix('html/healthcare/hc-denial-war-room.html', HIPAA_OLD, HIPAA_NEW, 'HIPAA deadline item'))
results.append(apply_fix('html/healthcare/executive-portal.html', HIPAA_OLD, HIPAA_NEW, 'HIPAA deadline item'))
results.append(apply_fix('html/bpo/bpo-executive-portal.html', GOV_OLD, GOV_NEW, 'ISO/SOC2 cert status'))

if all(results):
    print("\nAll fixes applied (or already present). Next:")
    print("  git add -A && git commit -m 'fix: apply HIPAA + ISO/SOC2 governance content'")
else:
    print("\nOne or more edits failed — see [FAIL] lines above. Do not commit yet.")
    sys.exit(1)