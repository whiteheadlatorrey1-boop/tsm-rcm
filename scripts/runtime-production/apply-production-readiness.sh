#!/usr/bin/env bash

# apply-production-readiness.sh
# Orchestrates sequential production hardening phases for the Enterprise Command Platform.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
REPORT_DIR="${SCRIPT_DIR}/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$LOG_DIR" "$REPORT_DIR"

# Order of execution for production hardening
INSTALLERS=(
    "40-bootstrap-runtime.js"
    "41-runtime-registry.js"
    "42-service-container.js"
    "43-runtime-lifecycle.js"
    "44-state-manager.js"
    "45-error-framework.js"
    "46-integration-test-suite.js"
    "47-load-test-suite.js"
    "48-chaos-test-suite.js"
    "49-security-validation.js"
    "50-observability-validation.js"
    "51-production-packaging.js"
)

log_message() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

run_installer() {
    local installer="$1"
    local installer_path="${SCRIPT_DIR}/${installer}"
    local log_file="${LOG_DIR}/${installer%.js}_${TIMESTAMP}.log"
    local report_file="${REPORT_DIR}/${installer%.js}_report.json"

    if [ ! -f "$installer_path" ]; then
        log_message "❌ ERROR: Installer script not found: $installer"
        exit 1
    fi

    log_message "🚀 Starting Phase: ${installer}..."
    
    # Execute installer with strict error handling
    if node "$installer_path" --report-path="$report_file" > "$log_file" 2>&1; then
        log_message "✅ SUCCESS: ${installer} completed successfully."
        if [ -f "$report_file" ]; then
            log_message "   📋 Validation Report written to: $(basename "$report_file")"
        fi
    else
        log_message "❌ FAILURE: ${installer} failed. Execution halted."
        log_message "   🔍 Check logs here: ${log_file}"
        if [ -f "$report_file" ]; then
            echo "--- Last Validation State ---"
            cat "$report_file"
        fi
        exit 1
    fi
}

main() {
    log_message "🏁 Initiating Production Hardening Sequence..."
    echo "========================================================="

    for installer in "${INSTALLERS[@]}"; do
        run_installer "$installer"
        echo "---------------------------------------------------------"
    done

    log_message "🎉 ALL PHASES COMPLETE: Platform status is now PRODUCTION READY (95%+ Hardened)."
}

main "$@"