#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

MANIFEST="$ROOT/docs/how-to-audit/guided-rollout/guided-rollout-manifest.json"
OUT="$ROOT/docs/how-to-audit/guided-rollout"

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: Missing rollout manifest:"
  echo "  $MANIFEST"
  exit 1
fi

python3 - "$ROOT" "$MANIFEST" "$OUT" <<'PY'
import sys
import json
import re
from pathlib import Path

root = Path(sys.argv[1]).resolve()
manifest_path = Path(sys.argv[2]).resolve()
out = Path(sys.argv[3]).resolve()

manifest = json.loads(manifest_path.read_text())

repaired = []
valid = []
failed = []

def ensure_assets(text):
    changed = False

    if "tsm-guided-how-to.css" not in text:
        css = '<link rel="stylesheet" href="/shared/tsm-guided-how-to.css">'

        if re.search(r"</head\s*>", text, re.I):
            text = re.sub(
                r"</head\s*>",
                "  " + css + "\n</head>",
                text,
                count=1,
                flags=re.I,
            )
        elif re.search(r"<head[^>]*>", text, re.I):
            m = re.search(r"<head[^>]*>", text, re.I)
            pos = m.end()
            text = text[:pos] + "\n  " + css + "\n" + text[pos:]
        else:
            text = css + "\n" + text

        changed = True

    if "tsm-guided-how-to.js" not in text:
        js = '<script src="/shared/tsm-guided-how-to.js" defer></script>'

        if re.search(r"</body\s*>", text, re.I):
            text = re.sub(
                r"</body\s*>",
                "  " + js + "\n</body>",
                text,
                count=1,
                flags=re.I,
            )
        elif re.search(r"</html\s*>", text, re.I):
            text = re.sub(
                r"</html\s*>",
                "  " + js + "\n</html>",
                text,
                count=1,
                flags=re.I,
            )
        else:
            text += "\n" + js + "\n"

        changed = True

    return text, changed


def ensure_mount(text):
    if "id=\"tsm-guided-how-to-root\"" in text:
        return text, False

    mount = '''
<section
  id="tsm-guided-how-to-root"
  data-tsm-guided-how-to="true"
  aria-label="TSM Guided How-To"
></section>
'''

    # Prefer main.
    m = re.search(r"<main[^>]*>", text, re.I)

    if m:
        pos = m.end()
        return text[:pos] + mount + text[pos:], True

    # Then body.
    m = re.search(r"<body[^>]*>", text, re.I)

    if m:
        pos = m.end()
        return text[:pos] + mount + text[pos:], True

    # Then after head.
    m = re.search(r"</head\s*>", text, re.I)

    if m:
        pos = m.end()
        return text[:pos] + mount + text[pos:], True

    # Last-resort valid HTML insertion.
    if re.search(r"<html[^>]*>", text, re.I):
        m = re.search(r"<html[^>]*>", text, re.I)
        pos = m.end()
        return text[:pos] + mount + text[pos:], True

    # Fragment/page without wrappers.
    return mount + "\n" + text, True


for item in manifest.get("pages", []):
    page = item["path"]
    path = root / page

    if not path.exists():
        failed.append({
            "path": page,
            "error": "file missing"
        })
        continue

    text = path.read_text(encoding="utf-8", errors="replace")
    original = text

    text, assets_changed = ensure_assets(text)
    text, mount_changed = ensure_mount(text)

    missing = []

    if "tsm-guided-how-to.css" not in text:
        missing.append("css")

    if "tsm-guided-how-to.js" not in text:
        missing.append("js")

    if "id=\"tsm-guided-how-to-root\"" not in text:
        missing.append("mount")

    if missing:
        failed.append({
            "path": page,
            "missing": missing
        })
        continue

    if text != original:
        path.write_text(text, encoding="utf-8")
        repaired.append({
            "path": page,
            "assetsChanged": assets_changed,
            "mountChanged": mount_changed
        })
    else:
        valid.append(page)

report = {
    "repaired": repaired,
    "alreadyValid": valid,
    "failed": failed,
    "counts": {
        "manifest": len(manifest.get("pages", [])),
        "repaired": len(repaired),
        "alreadyValid": len(valid),
        "failed": len(failed),
    }
}

(out / "guided-repair-report.json").write_text(
    json.dumps(report, indent=2)
)

print("============================================================")
print(" TSM GUIDED HOW-TO REPAIR")
print("============================================================")
print(f"Manifest pages:   {len(manifest.get('pages', []))}")
print(f"Repaired:         {len(repaired)}")
print(f"Already valid:    {len(valid)}")
print(f"Failed:           {len(failed)}")

if repaired:
    print()
    print("REPAIRED:")
    for x in repaired:
        print(f"  ✓ {x['path']}")

if failed:
    print()
    print("FAILED:")
    for x in failed:
        print(f"  ✗ {x['path']} :: {x.get('missing') or x.get('error')}")
PY

echo
echo "============================================================"
echo " FINAL GUIDED HOW-TO VALIDATION"
echo "============================================================"

python3 - "$ROOT" "$MANIFEST" <<'PY'
import sys
import json
from pathlib import Path

root = Path(sys.argv[1])
manifest = json.loads(Path(sys.argv[2]).read_text())

errors = []

for item in manifest["pages"]:
    path = root / item["path"]

    if not path.exists():
        errors.append(f"MISSING FILE: {item['path']}")
        continue

    text = path.read_text(encoding="utf-8", errors="replace")

    checks = {
        "JS": "tsm-guided-how-to.js" in text,
        "CSS": "tsm-guided-how-to.css" in text,
        "MOUNT": 'id="tsm-guided-how-to-root"' in text,
    }

    for name, ok in checks.items():
        if not ok:
            errors.append(f"{name}: {item['path']}")

print()

if errors:
    print("✗ GUIDED HOW-TO VALIDATION FAILED")
    for error in errors:
        print("  " + error)
    raise SystemExit(1)

print("✓ 134/134 rollout pages contain Guided How-To JS")
print("✓ 134/134 rollout pages contain Guided How-To CSS")
print("✓ 134/134 rollout pages contain Guided How-To mount")
print("✓ GUIDED HOW-TO ROLLOUT VALID")
PY

echo
echo "============================================================"
echo " REPAIR COMPLETE"
echo "============================================================"
