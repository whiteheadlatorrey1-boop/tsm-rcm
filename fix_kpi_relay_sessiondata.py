#!/usr/bin/env python3
"""
fix_kpi_relay_sessiondata.py

Fixes a bug present in all three Honeywell tools (plant-incident.html,
supplier-shutdown.html, cyber-incident.html): every KPI extraction function
has two paths — a structured KPI_JSON path (used when the LLM followed the
"IMPORTANT: output KPI_JSON: {...}" instruction) and a regex-scrape fallback
path (used when it didn't). The JSON path always writes the extracted value
into `sessionData.kpis.*` so it can be relayed downstream (e.g. to the
Strategist). The fallback path updates the visible KPI tile in the DOM but
NEVER writes to sessionData.kpis — so any KPI whose value came from the
scrape fallback silently vanishes from the relay payload even though it's
sitting right there on screen.

This patches each fallback branch to also record:
    sessionData.kpis.<field> = { scraped: <value>, source: 'regex-fallback' };
when a value was actually found by the regex (leaving kpis.<field> unset,
same as before, when nothing was found — matching the existing
"N/A means no data" semantics elsewhere in these files).

Aborts with zero changes to ANY file if any anchor isn't found exactly once
in its target file. Writes .bak backups before touching anything.

Usage:
    python3 fix_kpi_relay_sessiondata.py [--root /path/to/repo]
"""
import argparse
import shutil
import sys
from pathlib import Path

# Each entry: (relative path, [(old, new), ...])
EDITS = {
    "html/plant-incident.html": [
        (
            """  const m = text.match(/\\$[\\d,]+(?:\\s*[-–]\\s*\\$[\\d,]+)?/);
  document.getElementById('kpiExposure').textContent = m ? m[0].slice(0,16) : 'N/A';
}

function extractDowntimeKPI(text) {
  const m = text.match(/(\\d+[-–]\\d+\\s*hours?|\\d+\\s*hours?|\\d+\\s*days?)/i);
  document.getElementById('kpiDowntime').textContent = m ? m[0] : 'N/A';
}""",
            """  const m = text.match(/\\$[\\d,]+(?:\\s*[-–]\\s*\\$[\\d,]+)?/);
  document.getElementById('kpiExposure').textContent = m ? m[0].slice(0,16) : 'N/A';
  if (m) sessionData.kpis.exposure = { scraped: m[0], source: 'regex-fallback' };
}

function extractDowntimeKPI(text) {
  const m = text.match(/(\\d+[-–]\\d+\\s*hours?|\\d+\\s*hours?|\\d+\\s*days?)/i);
  document.getElementById('kpiDowntime').textContent = m ? m[0] : 'N/A';
  if (m) sessionData.kpis.downtime = { scraped: m[0], source: 'regex-fallback' };
}""",
        ),
    ],
    "html/supplier-shutdown.html": [
        (
            """  const m=text.match(/\\$[\\d,.]+(?:\\s*[-–]\\s*\\$[\\d,.]+)?/);
  document.getElementById('kpiExposure').textContent=m?m[0].slice(0,14):'N/A';
}""",
            """  const m=text.match(/\\$[\\d,.]+(?:\\s*[-–]\\s*\\$[\\d,.]+)?/);
  document.getElementById('kpiExposure').textContent=m?m[0].slice(0,14):'N/A';
  if(m) sessionData.kpis.exposure={ scraped:m[0], source:'regex-fallback' };
}""",
        ),
        (
            """  const m=text.match(/(\\d+)\\s*days?/i);
  document.getElementById('kpiBuffer').textContent=m?m[0]:'N/A';
}""",
            """  const m=text.match(/(\\d+)\\s*days?/i);
  document.getElementById('kpiBuffer').textContent=m?m[0]:'N/A';
  if(m) sessionData.kpis.buffer={ scraped:m[0], source:'regex-fallback' };
}""",
        ),
        (
            """  const m=text.match(/(\\d+)\\s*orders?/i);
  document.getElementById('kpiOrders').textContent=m?m[1]+' orders':'N/A';
}""",
            """  const m=text.match(/(\\d+)\\s*orders?/i);
  document.getElementById('kpiOrders').textContent=m?m[1]+' orders':'N/A';
  if(m) sessionData.kpis.orders={ scraped:m[1]+' orders', source:'regex-fallback' };
}""",
        ),
    ],
    "html/cyber-incident.html": [
        (
            """  const m = text.match(/\\$[\\d,]+(?:\\s*[-–]\\s*\\$[\\d,]+)?/);
  document.getElementById('kpiExposure').textContent = m ? m[0].slice(0,16) : 'N/A';
}

function extractDowntimeKPI(text) {
  const json = parseKpiJson(text);
  if (json && json.containmentEta) {
    document.getElementById('kpiDowntime').textContent = json.containmentEta;
    sessionData.kpis.containment = json;
    return;
  }
  const m = text.match(/(\\d+[-–]\\d+\\s*hours?|\\d+\\s*hours?|\\d+\\s*days?)/i);
  document.getElementById('kpiDowntime').textContent = m ? m[0] : 'N/A';
}""",
            """  const m = text.match(/\\$[\\d,]+(?:\\s*[-–]\\s*\\$[\\d,]+)?/);
  document.getElementById('kpiExposure').textContent = m ? m[0].slice(0,16) : 'N/A';
  if (m) sessionData.kpis.exposure = { scraped: m[0], source: 'regex-fallback' };
}

function extractDowntimeKPI(text) {
  const json = parseKpiJson(text);
  if (json && json.containmentEta) {
    document.getElementById('kpiDowntime').textContent = json.containmentEta;
    sessionData.kpis.containment = json;
    return;
  }
  const m = text.match(/(\\d+[-–]\\d+\\s*hours?|\\d+\\s*hours?|\\d+\\s*days?)/i);
  document.getElementById('kpiDowntime').textContent = m ? m[0] : 'N/A';
  if (m) sessionData.kpis.containment = { scraped: m[0], source: 'regex-fallback' };
}""",
        ),
        (
            """  const m = text.match(/(\\d{2,3})\\/100|RISK[:\\s]+(\\d{2,3})/i);
  document.getElementById('kpiRisk').textContent = m ? (m[1]||m[2]) + '/100' : 'N/A';
}""",
            """  const m = text.match(/(\\d{2,3})\\/100|RISK[:\\s]+(\\d{2,3})/i);
  document.getElementById('kpiRisk').textContent = m ? (m[1]||m[2]) + '/100' : 'N/A';
  if (m) sessionData.kpis.risk = { scraped: (m[1]||m[2]) + '/100', source: 'regex-fallback' };
}""",
        ),
    ],
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Repo root (default: current directory)")
    args = ap.parse_args()
    root = Path(args.root)

    problems = []
    for rel_path, edits in EDITS.items():
        p = root / rel_path
        if not p.exists():
            problems.append(f"  - {rel_path} not found")
            continue
        text = p.read_text(encoding="utf-8")
        for i, (old, new) in enumerate(edits):
            count = text.count(old)
            if count != 1:
                problems.append(f"  - {rel_path} edit #{i+1}: expected 1 match, found {count}")

    if problems:
        print("ABORTING — no changes made to any file. The following didn't match as expected:")
        print("\n".join(problems))
        print("\nPaste the current file contents so the patch can be adjusted.")
        sys.exit(1)

    for rel_path, edits in EDITS.items():
        p = root / rel_path
        backup = p.with_suffix(p.suffix + ".bak")
        shutil.copy2(p, backup)
        print(f"Backup written to {backup}")
        text = p.read_text(encoding="utf-8")
        for old, new in edits:
            text = text.replace(old, new, 1)
        p.write_text(text, encoding="utf-8")
        print(f"Patched {rel_path}: {len(edits)} KPI fallback branch(es) now write to sessionData.kpis")

    print("\nDone. Next steps:")
    print("  python3 check_html_script_syntax.py html/plant-incident.html")
    print("  python3 check_html_script_syntax.py html/supplier-shutdown.html")
    print("  python3 check_html_script_syntax.py html/cyber-incident.html")
    print("  git diff")


if __name__ == "__main__":
    main()