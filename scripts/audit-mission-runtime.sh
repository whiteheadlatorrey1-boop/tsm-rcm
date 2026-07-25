#!/usr/bin/env bash
set -e

ROOT="${1:-.}"

echo
echo "==============================================="
echo "      TSM ENTERPRISE RUNTIME AUDIT"
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

count "Relay Keys" "_relay"

count "Polling Timers" "setInterval"

count "Storage Events" "addEventListener\\(['\"]storage"

count "Mission Events" "MISSION_"

####################################################
echo
echo "WAR ROOMS"
echo "----------"

count "Construction" "construction-war-room"
count "Healthcare" "healthcare-war-room"
count "Mortgage" "mortgage"
count "Legal" "legal"
count "Insurance" "insurance"
count "BPO" "bpo"

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
echo "Top relay keys"

grep -Rho --exclude-dir=node_modules --exclude-dir=.git "TSM_[A-Z0-9_]*" "$ROOT" \
    | sort \
    | uniq \
    | head -100

echo
echo "Top localStorage keys"

grep -Rho --exclude-dir=node_modules --exclude-dir=.git "localStorage\.[gs]etItem([^)]*)" "$ROOT" \
    | head -100

echo
echo "==============================================="
echo "Audit Complete"
echo "==============================================="
