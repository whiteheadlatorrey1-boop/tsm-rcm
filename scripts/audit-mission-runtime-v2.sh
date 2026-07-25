#!/usr/bin/env bash
set -e
ROOT="${1:-.}"

echo
echo "==============================================="
echo "      TSM ENTERPRISE RUNTIME AUDIT (v2)"
echo "==============================================="
echo

check() {
    local label="$1"
    local pattern="$2"
    if grep -RIn --exclude-dir=node_modules --exclude-dir=.git -E "$pattern" "$ROOT" >/dev/null 2>&1
    then
        echo "✅ $label"
    else
        echo "❌ $label"
    fi
}

count() {
    local label="$1"
    local pattern="$2"
    local n
    n=$(grep -RIn --exclude-dir=node_modules --exclude-dir=.git -E "$pattern" "$ROOT" 2>/dev/null | wc -l)
    printf "%-40s %5d\n" "$label" "$n"
}

####################################################
echo
echo "MISSION RUNTIME"
echo "----------------"
check "Mission Model" "MissionModel|mission-model"
check "Mission Store" "MissionStore|mission-store"
check "Mission Engine" "MissionEngine|mission-engine"
check "Mission Events" "MissionEvents|MISSION_CREATED|MISSION_UPDATED"
check "Mission Timeline" "MissionTimeline|timeline"
check "Mission Tasks" "MissionTask|tasks"
check "Mission Validation" "mission-validation"
check "Mission Confidence" "mission-confidence"
check "Mission Analytics" "mission-analytics"
check "Mission Workforce" "mission-workforce"
check "Mission Routing" "mission-routing"
check "Mission Sync" "mission-sync"

####################################################
echo
echo "OPERATIONS"
echo "-----------"
check "TSMOpsCore" "TSMOpsCore"
check "Work Item Model" "createWorkItem"
check "Tenant Support" "createTenant"
check "Audit Log" "auditLog"
check "SLA Engine" "computeSla"
check "Metrics Engine" "getMetrics"
check "Global Metrics" "getGlobalMetrics"

####################################################
echo
echo "DOCUMENT INTAKE"
echo "---------------"
check "Universal Intake" "tsm-doc-search-multi"
check "OCR" "OCR|ocr"
check "Classification" "classification"
check "Extraction" "extract"
check "Entity Extraction" "entity"
check "Confidence Scores" "confidence"
check "Validation" "validation"
check "Duplicate Detection" "duplicate"
check "Mission Creation" "Mission"

####################################################
echo
echo "EVENT ARCHITECTURE"
echo "------------------"
count "localStorage.setItem()" "localStorage\.setItem"
count "localStorage.getItem()" "localStorage\.getItem"
count "Relay Keys (line matches, case-insensitive)" "_relay"
grep -RIni --exclude-dir=node_modules --exclude-dir=.git -E "_relay" "$ROOT" >/tmp/relay_lines.txt 2>/dev/null || true
count "Polling Timers" "setInterval"
count "Storage Events" "addEventListener\\(['\"]storage"
count "Mission Events" "MISSION_"

####################################################
echo
echo "WAR ROOMS (real entryPoint file line counts, from phases.json)"
echo "----------------------------------------------------------------"
war_room_wc() {
    local label="$1"
    local path="$2"
    if [ -f "$ROOT/$path" ]; then
        local n
        n=$(wc -l < "$ROOT/$path")
        printf "%-15s %6d   %s\n" "$label" "$n" "$path"
    else
        printf "%-15s %6s   %s (FILE NOT FOUND)\n" "$label" "---" "$path"
    fi
}
war_room_wc "Construction"  "war-rooms/construction/construction-war-room.html"
war_room_wc "Healthcare"    "war-rooms/healthcare/healthcare-war-room.html"
war_room_wc "Mortgage"      "war-rooms/mortgage/mortgage-war-room.html"
war_room_wc "Legal"         "war-rooms/legal/legal-war-room.html"
war_room_wc "Insurance"     "war-rooms/insurance/insurance-war-room.html"
war_room_wc "BPO"           "war-rooms/bpo/bpo-war-room.html"
echo
echo "(If a path above shows FILE NOT FOUND, the real path differs from"
echo " this guess -- run: find . -iname '*<vertical>*war-room*.html' to locate it,"
echo " and update this script's war_room_wc calls accordingly. Do NOT trust"
echo " a repo-wide word-count for these -- that was the v1 bug.)"

####################################################
echo
echo "EXECUTIVE"
echo "----------"
check "Executive Portal" "executive-portal"
check "Strategist" "strategist"
check "Sentinel" "sentinel"

####################################################
echo
echo "MDM"
echo "----"
check "MDM Engine" "mdm-engine"
check "MDM Store" "mdm-store"
check "MDM Router" "mdm-router"

####################################################
echo
echo "SUMMARY"
echo "--------"
echo
UNIQUE_RELAY_KEYS=$(grep -Rho --exclude-dir=node_modules --exclude-dir=.git -E "TSM_[A-Z0-9_]*" "$ROOT" 2>/dev/null | sort -u | wc -l)
echo "Total UNIQUE TSM_* relay-style keys found: $UNIQUE_RELAY_KEYS"
echo "(First 100 alphabetically, for reference:)"
grep -Rho --exclude-dir=node_modules --exclude-dir=.git -E "TSM_[A-Z0-9_]*" "$ROOT" 2>/dev/null \
    | sort -u \
    | head -100
echo
echo "Total localStorage.[gs]etItem(...) call sites:"
grep -Rho --exclude-dir=node_modules --exclude-dir=.git -E "localStorage\.[gs]etItem\([^)]*\)" "$ROOT" 2>/dev/null | wc -l
echo "(First 100 call sites, for reference:)"
grep -Rho --exclude-dir=node_modules --exclude-dir=.git -E "localStorage\.[gs]etItem\([^)]*\)" "$ROOT" 2>/dev/null | head -100
echo
echo "==============================================="
echo "Audit Complete (v2 -- see fixes noted inline above)"
echo "==============================================="
