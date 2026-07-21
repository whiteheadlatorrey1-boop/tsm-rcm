#!/bin/bash

set -e

echo "=========================================="
echo "TSM Enterprise Operating System Validation"
echo "=========================================="

PASS=0
FAIL=0


check_file(){

if [ -f "$1" ]; then

echo "PASS:"
echo "$1"

PASS=$((PASS+1))

else

echo "FAIL:"
echo "$1"

FAIL=$((FAIL+1))

fi

}



echo ""
echo "Checking Enterprise Runtime..."

check_file html/shared/runtime/enterprise/enterprise-runtime.js
check_file html/shared/runtime/enterprise/mission-engine.js
check_file html/shared/runtime/enterprise/sap-phase-intelligence.js
check_file html/shared/runtime/enterprise/digital-twin-engine.js
check_file html/shared/runtime/enterprise/sentinel-governance-engine.js


echo ""
echo "Checking Intelligence Layers..."

check_file html/shared/runtime/enterprise/intelligence-fusion-engine.js
check_file html/shared/runtime/enterprise/decision-intelligence-engine.js
check_file html/shared/runtime/enterprise/neural-memory-engine.js
check_file html/shared/runtime/enterprise/ai-agent-orchestrator.js


echo ""
echo "Checking Execution Layers..."

check_file html/shared/runtime/enterprise/autonomous-mission-executor.js
check_file html/shared/runtime/enterprise/human-approval-gateway.js
check_file html/shared/runtime/enterprise/enterprise-integration-hub.js


echo ""
echo "Checking Event Mesh..."

check_file html/shared/runtime/enterprise/enterprise-event-bus.js
check_file html/shared/runtime/enterprise/event-router-engine.js
check_file html/shared/runtime/enterprise/event-correlation-engine.js


echo ""
echo "Checking Executive Interfaces..."

check_file html/executive-command-center/index.html
check_file html/executive-command-center/demo-launcher.html
check_file html/executive-command-center/demo-cockpit.html
check_file html/executive-command-center/event-monitor.html
check_file html/executive-command-center/optimization-center.html


echo ""
echo "Checking Enterprise Data..."

check_file data/enterprise-lab/sap-phase-library.json
check_file data/enterprise-lab/digital-twin-model.json
check_file data/enterprise-lab/sentinel-evidence-log.json
check_file data/enterprise-lab/neural-memory-store.json
check_file data/enterprise-lab/event-catalog.json


echo ""
echo "=========================================="
echo "RESULT"
echo "=========================================="

echo "PASSED:"
echo "$PASS"

echo "FAILED:"
echo "$FAIL"


if [ "$FAIL" -eq 0 ]; then

echo ""
echo "ENTERPRISE OPERATING SYSTEM READY"
exit 0

else

echo ""
echo "REVIEW FAILED COMPONENTS"
exit 1

fi
