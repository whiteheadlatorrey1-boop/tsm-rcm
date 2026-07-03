#!/usr/bin/env python3
import sys, shutil
from pathlib import Path

MARKER = "<!-- TSM ENFORCER BOOT -->"

CORRECTED_TAIL = """<!-- TSM ENFORCER BOOT -->
<script src="../../core/tsm-enforcer.js"></script>

<script>
// ===== TSM WAR ROOM SCOPED RELAY FIX =====
window.tsmMission = window.tsmMission || {
  id: "HEALTHCARE-" + Date.now().toString(36),
  vertical: "healthcare"
};

function tsmWriteRelay(payload){
  TSM_KERNEL.setRelay("healthcare", JSON.stringify(payload));
}
</script>

<script>
// ===== TSM EXEC BRIDGE LAYER =====
function tsmWriteScopedExec(vertical, missionId){
  localStorage.setItem("TSM_EXEC_CONFIRMED_healthcare_" + vertical, JSON.stringify({
    vertical,
    missionId,
    timestamp: Date.now()
  }));
}
</script>

<!-- TSM CONTROL PLANE -->
<script src="/html/js/core/tsm-event-bus.js"></script>
<script src="/html/js/core/tsm-state.js"></script>
<script src="/html/js/core/tsm-mission-engine.js"></script>
<script src="/shared/tsm-exec-portal-upgrade.js"></script>
</body>
</html>
"""

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fix_bug2.py <path-to-executive-portal.html>")
        sys.exit(1)
    target = Path(sys.argv[1])
    if not target.exists():
        print(f"File not found: {target}")
        sys.exit(1)
    text = target.read_text(encoding="utf-8")
    if MARKER not in text:
        print(f"ERROR: marker '{MARKER}' not found. Aborting without touching the file.")
        sys.exit(1)
    if text.count(MARKER) > 1:
        print(f"ERROR: marker appears more than once. Aborting without touching the file.")
        sys.exit(1)
    backup = target.with_suffix(target.suffix + ".bak")
    shutil.copy2(target, backup)
    print(f"Backup written to {backup}")
    head, _, _ = text.partition(MARKER)
    target.write_text(head + CORRECTED_TAIL, encoding="utf-8")
    print(f"Fixed: {target}")

if __name__ == "__main__":
    main()
