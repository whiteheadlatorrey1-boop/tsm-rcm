#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

MANIFEST="$ROOT/docs/how-to-audit/workflow-manifest.json"
GUIDED_JS="$ROOT/html/shared/tsm-guided-how-to.js"
GUIDED_CSS="$ROOT/html/shared/tsm-guided-how-to.css"

OUT="$ROOT/docs/how-to-audit/guided-rollout"
BACKUP="$OUT/backups"

mkdir -p "$OUT" "$BACKUP"

echo "============================================================"
echo " TSM GUIDED HOW-TO PLATFORM ROLLOUT"
echo "============================================================"

if [[ ! -f "$MANIFEST" ]]; then
  echo "ERROR: Missing workflow manifest:"
  echo "  $MANIFEST"
  exit 1
fi

if [[ ! -f "$GUIDED_JS" ]]; then
  echo "ERROR: Missing:"
  echo "  $GUIDED_JS"
  exit 1
fi

if [[ ! -f "$GUIDED_CSS" ]]; then
  echo "ERROR: Missing:"
  echo "  $GUIDED_CSS"
  exit 1
fi

python3 - "$ROOT" "$MANIFEST" "$OUT" "$BACKUP" <<'PY'
import sys
import json
import re
import shutil
from pathlib import Path
from datetime import datetime, timezone

root = Path(sys.argv[1]).resolve()
manifest_path = Path(sys.argv[2]).resolve()
out = Path(sys.argv[3]).resolve()
backup = Path(sys.argv[4]).resolve()

data = json.loads(manifest_path.read_text())
workflows = data.get("workflows", [])

# High-value application surfaces first.
TARGET_PATTERNS = [
    "/war-rooms/",
    "-command",
    "-command.",
    "command/",
    "-war-room",
    "war-room/",
    "strategist",
    "executive-portal",
    "situation-room",
]

# Never automatically modify these classes of pages.
SKIP_PATTERNS = [
    "/demo/",
    "presentation",
    "pitch",
    "talktrack",
    "preview",
    "pricing",
    "access.html",
    "client-access.html",
]

# Schools is already our reference implementation.
REFERENCE_PAGES = {
    "html/war-rooms/schools-command/schools-command.html"
}

def is_target(page):
    p = page.lower()

    if p in REFERENCE_PAGES:
        return False

    if any(x in p for x in SKIP_PATTERNS):
        return False

    return any(x in p for x in TARGET_PATTERNS)

def safe_backup_name(rel):
    return rel.replace("/", "__")

def detect_assets(text):
    return {
        "js": "tsm-guided-how-to.js" in text,
        "css": "tsm-guided-how-to.css" in text,
    }

def inject_assets(text):
    changed = False

    if "tsm-guided-how-to.css" not in text:
        css = '<link rel="stylesheet" href="/shared/tsm-guided-how-to.css">'
        if "</head>" in text:
            text = text.replace("</head>", f"  {css}\n</head>", 1)
            changed = True

    if "tsm-guided-how-to.js" not in text:
        js = '<script src="/shared/tsm-guided-how-to.js" defer></script>'
        if "</body>" in text:
            text = text.replace("</body>", f"  {js}\n</body>", 1)
            changed = True
        elif "</html>" in text:
            text = text.replace("</html>", f"  {js}\n</html>", 1)
            changed = True
        else:
            text += "\n" + js + "\n"
            changed = True

    return text, changed

def inject_mount(text):
    # The shared runtime can discover this marker and mount itself.
    marker = "tsm-guided-how-to-root"

    if marker in text:
        return text, False

    candidates = [
        r'<main([^>]*)>',
        r'<body([^>]*)>',
    ]

    mount = '''
<section
  id="tsm-guided-how-to-root"
  data-tsm-guided-how-to="true"
  aria-label="TSM Guided How-To"
></section>
'''

    for pattern in candidates:
        m = re.search(pattern, text, re.I)
        if m:
            pos = m.end()
            text = text[:pos] + mount + text[pos:]
            return text, True

    return text, False

def infer_vertical(item):
    v = str(item.get("vertical", "general")).strip().lower()

    aliases = {
        "realestate": "real_estate",
        "real-estate": "real_estate",
        "real estate": "real_estate",
        "fin-ops": "finops",
        "it-ops": "itops",
    }

    return aliases.get(v, v or "general")

selected = []
skipped = []
modified = []
already = []
errors = []

for item in workflows:
    page = item.get("path") or item.get("file") or item.get("html")

    if not page:
        continue

    page = page.lstrip("./")

    if not is_target(page):
        skipped.append({
            "path": page,
            "reason": "not-high-value-target-or-protected-page"
        })
        continue

    selected.append(page)

    full = root / page

    if not full.exists():
        errors.append({
            "path": page,
            "error": "file-not-found"
        })
        continue

    try:
        text = full.read_text(encoding="utf-8", errors="replace")

        assets = detect_assets(text)

        if assets["js"] and assets["css"] and "tsm-guided-how-to-root" in text:
            already.append(page)
            continue

        # Backup before mutation.
        backup_file = backup / safe_backup_name(page)
        backup_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(full, backup_file)

        original = text

        text, assets_changed = inject_assets(text)
        text, mount_changed = inject_mount(text)

        if text != original:
            full.write_text(text, encoding="utf-8")

            modified.append({
                "path": page,
                "vertical": infer_vertical(item),
                "priority": item.get("priority", "P1"),
                "actions": item.get("actions", 0),
                "report_capable_pages": item.get("report_capable_pages", 0),
                "assets_injected": assets_changed,
                "mount_injected": mount_changed,
                "backup": str(backup_file.relative_to(root)),
            })
        else:
            already.append(page)

    except Exception as exc:
        errors.append({
            "path": page,
            "error": str(exc)
        })

timestamp = datetime.now(timezone.utc).isoformat()

rollout = {
    "generatedAt": timestamp,
    "referenceImplementation": "html/war-rooms/schools-command/schools-command.html",
    "strategy": "high-value-command-and-war-room-rollout",
    "selected": len(selected),
    "modified": len(modified),
    "alreadyIntegrated": len(already),
    "skipped": len(skipped),
    "errors": len(errors),
    "pages": modified,
}

(out / "guided-rollout-manifest.json").write_text(
    json.dumps(rollout, indent=2)
)

(out / "guided-rollout-errors.json").write_text(
    json.dumps(errors, indent=2)
)

(out / "guided-rollout-skipped.json").write_text(
    json.dumps(skipped, indent=2)
)

# Human-readable report.
lines = [
    "# TSM Guided How-To Rollout",
    "",
    f"Generated: {timestamp}",
    "",
    "## Reference Implementation",
    "",
    "`html/war-rooms/schools-command/schools-command.html`",
    "",
    "Schools is intentionally excluded from automatic modification because "
    "its Guided How-To implementation and E2E contract are already proven.",
    "",
    "## Results",
    "",
    f"- Selected: {len(selected)}",
    f"- Modified: {len(modified)}",
    f"- Already integrated: {len(already)}",
    f"- Skipped: {len(skipped)}",
    f"- Errors: {len(errors)}",
    "",
    "## Modified Pages",
    "",
]

for x in modified:
    lines.append(
        f"- `{x['path']}` — {x['priority']} — "
        f"{x['vertical']} — actions={x['actions']}"
    )

lines += [
    "",
    "## Design Rule",
    "",
    "**PROBLEM → START → INPUT → ANALYZE → REVIEW → DECIDE → EXECUTE → REPORT → MEASURE**",
    "",
    "The rollout injects the shared Guided How-To runtime and mount point. "
    "It does not replace existing application logic.",
    "",
]

if errors:
    lines += ["## Errors", ""]
    for x in errors:
        lines.append(f"- `{x['path']}` — {x['error']}")

(out / "guided-rollout.md").write_text("\n".join(lines))

print()
print("============================================================")
print(" GUIDED HOW-TO ROLLOUT RESULTS")
print("============================================================")
print(f"Selected:             {len(selected)}")
print(f"Modified:             {len(modified)}")
print(f"Already integrated:   {len(already)}")
print(f"Skipped:              {len(skipped)}")
print(f"Errors:               {len(errors)}")
print()
print("Reports:")
print(f"  {out}/guided-rollout.md")
print(f"  {out}/guided-rollout-manifest.json")
print(f"  {out}/guided-rollout-errors.json")
print()
PY

echo "============================================================"
echo " VALIDATING ROLLOUT"
echo "============================================================"

python3 - "$ROOT" "$OUT/guided-rollout-manifest.json" <<'PY'
import sys
import json
from pathlib import Path

root = Path(sys.argv[1])
manifest = json.loads(Path(sys.argv[2]).read_text())

errors = []

for page in manifest["pages"]:
    p = root / page["path"]

    if not p.exists():
        errors.append(f"MISSING: {page['path']}")
        continue

    text = p.read_text(encoding="utf-8", errors="replace")

    if "tsm-guided-how-to.js" not in text:
        errors.append(f"NO JS: {page['path']}")

    if "tsm-guided-how-to.css" not in text:
        errors.append(f"NO CSS: {page['path']}")

    if "tsm-guided-how-to-root" not in text:
        errors.append(f"NO MOUNT: {page['path']}")

if errors:
    print("ROLLOUT VALIDATION FAILED")
    for e in errors:
        print("  " + e)
    raise SystemExit(1)

print("✓ All modified pages contain Guided How-To JS")
print("✓ All modified pages contain Guided How-To CSS")
print("✓ All modified pages contain Guided How-To mount")
print("✓ No modified-page validation errors")
PY

echo
echo "============================================================"
echo " NEXT VALIDATION"
echo "============================================================"
echo
echo "Run the engine tests:"
echo "  node tests/how-to/how-to-engine.test.js"
echo
echo "Run the guided How-To tests:"
echo "  node tests/how-to/guided-how-to.test.js"
echo
echo "Run the Schools reference E2E:"
echo "  npx playwright test tests/e2e/schools-guided-how-to.spec.js --reporter=list"
echo
echo "============================================================"
echo " GUIDED HOW-TO ROLLOUT COMPLETE"
echo "============================================================"
