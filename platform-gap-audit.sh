#!/usr/bin/env bash
# TSM Platform Gap Audit — Stage 1: Static Discovery
#
# Read-only. Never modifies the repo. Checks, per registered vertical:
#   - war room / strategist / executive portal files present
#   - TSMCaseManager referenced in the exec portal
#   - Delivery Package referenced in the exec portal
#   - Shared decision-engine keywords referenced in the exec portal
#   - membership in DOC_ROUTER_TO_MISSION_VERTICAL (doc-intake reachable)
#
# This is a STATIC check only (Stage 1 of the audit methodology). It tells
# you whether the wiring exists in source, not whether a document actually
# flows through it at runtime. Stage 2 (Playwright + a synthetic
# TSM-GOLDEN-001 fixture per vertical, asserting on TSMPlatformAudit events)
# is the next step once this static picture stabilizes.
#
# Usage: run from the repo root.
#   chmod +x platform-gap-audit.sh
#   ./platform-gap-audit.sh
#
# Update the VERT_* arrays below if paths change or new verticals are added.
# Leave a path blank ("") if that tier doesn't exist for a vertical yet —
# the script will report it as missing rather than erroring.

set -uo pipefail

# key -> label
declare -A LABEL=(
  [hw]="Honeywell"        [fo]="FinOps"            [ins]="Insurance"
  [con]="Construction"    [bpo]="BPO"              [logistics]="Logistics"
  [vendor]="Vendor/Supplier" [hotel]="HotelOps"     [re]="Real Estate"
  [mortgage]="Mortgage"   [pm]="PM Copilot"        [noc]="NOC"
  [l1]="L1 Copilot"       [schools]="Schools"      [leg]="Legal"
  [hc]="Healthcare"       [o2c]="O2C"              [crm]="CRM"
  [approval]="Approval"   [cpq]="CPQ"              [catalog]="Catalog"
  [mdm]="MDM"             [governance]="Governance"
)

# key -> executive portal path (primary file checked for engine references)
declare -A EXEC=(
  [hw]="html/war-rooms/honeywell-executive-portal.html"
  [fo]="html/finops-suite/finops-war/finops-executive-portal.html"
  [ins]="html/war-rooms/insure-war/insurance-executive-portal.html"
  [con]="html/war-rooms/construct-war/construction-executive-portal.html"
  [bpo]="html/war-rooms/bpo-war/bpo-executive-portal.html"
  [logistics]="html/logistics/logistics-executive-portal.html"
  [vendor]="html/supplier-vendor/supplier-vendor-executive-portal.html"
  [hotel]="html/hotelops/hotelops-executive-portal.html"
  [re]="html/war-rooms/re-war/re-exec-portal.html"
  [mortgage]="html/war-rooms/mortgage/mortgage-executive-portal.html"
  [pm]="html/war-rooms/pm-copilot/pm-exec-portal.html"
  [noc]="html/l1-copilot/noc/noc-executive-portal.html"
  [l1]=""
  [schools]="html/war-rooms/schools-command/schools-executive-portal.html"
  [leg]="html/war-rooms/legal-war/legal-executive-portal.html"
  [hc]="html/healthcare/executive-portal.html"
  [o2c]="html/war-rooms/o2c/o2c-executive-portal.html"
  [crm]="html/war-rooms/crm/crm-executive-portal.html"
  [approval]="html/war-rooms/approval/approval-executive-portal.html"
  [cpq]="html/war-rooms/cpq/cpq-executive-portal.html"
  [catalog]="html/war-rooms/catalog/catalog-executive-portal.html"
  [mdm]="html/war-rooms/mdm/mdm-executive-portal.html"
  [governance]="html/war-rooms/governance/governance-executive-portal.html"
)

# key -> war room path (blank if not resolved / doesn't exist)
declare -A WARROOM=(
  [hw]="html/plant-incident.html"
  [fo]="html/finops-suite/finops-war/finops-war-room.html"
  [ins]="html/war-rooms/insure-war/insurance-war-room.html"
  [con]="html/war-rooms/construct-war/construction-war-room.html"
  [bpo]="html/war-rooms/bpo-war/bpo-war-room.html"
  [logistics]=""
  [vendor]=""
  [hotel]="html/hotelops/hotelops-war-room.html"
  [re]="html/war-rooms/re-war/re-war-room.html"
  [mortgage]="html/war-rooms/mortgage/mortgage-war-room.html"
  [pm]=""
  [noc]="html/l1-copilot/noc/noc-war-room.html"
  [l1]=""
  [schools]=""
  [leg]="html/war-rooms/legal-war/legal-war-room.html"
  [hc]="html/healthcare/hc-denial-war-room.html"
  [o2c]="html/war-rooms/o2c/o2c-war-room.html"
  [crm]="html/war-rooms/crm/crm-war-room.html"
  [approval]="html/war-rooms/approval/approval-war-room.html"
  [cpq]="html/war-rooms/cpq/cpq-war-room.html"
  [catalog]="html/war-rooms/catalog/catalog-war-room.html"
  [mdm]="html/war-rooms/mdm/mdm-war-room.html"
  [governance]="html/war-rooms/governance/governance-war-room.html"
)

# Verticals currently reachable from DOC_ROUTER_TO_MISSION_VERTICAL in
# tsm-doc-search-multi.html. Keep this in sync manually, or replace with a
# live grep against that object if you want it self-updating.
ROUTED="fo ins con bpo re leg hc hotel hw mortgage schools"

check_mark() { [ -n "$1" ] && [ -f "$1" ] && echo "YES" || echo "NO"; }

grep_check() {
  local file="$1" pattern="$2"
  [ -n "$file" ] && [ -f "$file" ] && grep -qE "$pattern" "$file" 2>/dev/null && echo "YES" || echo "NO"
}

in_list() {
  local key="$1"
  for w in $ROUTED; do [ "$w" = "$key" ] && { echo "YES"; return; }; done
  echo "NO"
}

printf "%-16s %-9s %-9s %-9s %-9s %-9s %-9s\n" "VERTICAL" "ROUTED" "WARROOM" "STRAT/EXEC" "CASEENG" "DELIVERY" "DECISION"
printf '%.0s-' {1..80}; echo

for key in "${!LABEL[@]}"; do
  exec_path="${EXEC[$key]}"
  war_path="${WARROOM[$key]}"

  routed=$(in_list "$key")
  warroom=$(check_mark "$war_path")
  exec_present=$(check_mark "$exec_path")
  case_eng=$(grep_check "$exec_path" 'TSMCaseManager')
  delivery=$(grep_check "$exec_path" 'DeliveryPackage|deliveryPackage|buildDelivery')
  decision=$(grep_check "$exec_path" 'DecisionEngine|decisionEngine|makeDecision|evaluateDecision')

  printf "%-16s %-9s %-9s %-9s %-9s %-9s %-9s\n" \
    "${LABEL[$key]}" "$routed" "$warroom" "$exec_present" "$case_eng" "$delivery" "$decision"
done | sort

echo
echo "Legend: ROUTED = in DOC_ROUTER_TO_MISSION_VERTICAL (doc intake reaches a Case/Mission)."
echo "This is a static check only — YES means the reference exists in source, not that it fires at runtime."
echo "Update the EXEC/WARROOM path tables above if any paths are wrong or missing."
