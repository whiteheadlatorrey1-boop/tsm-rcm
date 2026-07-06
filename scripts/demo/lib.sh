#!/usr/bin/env bash
# scripts/demo/lib.sh
# Shared helpers for the demo certification suite. Sourced by every check-*.sh
# and by demo-certify.sh. Not meant to be run directly.

# Resolve repo root regardless of where the caller cd'd from.
DEMO_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DEMO_LIB_DIR/../.." && pwd)"
HTML_ROOT="$REPO_ROOT/html"
REPORTS_DIR="$REPO_ROOT/reports"
LOG_DIR="$REPORTS_DIR/logs"
SHOT_DIR="$REPORTS_DIR/screenshots"
READINESS_FILE="$REPORTS_DIR/demo-readiness.txt"

mkdir -p "$LOG_DIR" "$SHOT_DIR"

# Colors (disabled automatically if not a tty, e.g. inside CI logs)
if [ -t 1 ]; then
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
  C_BLUE=$'\033[34m'; C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_BOLD=""; C_RESET=""
fi

# Per-check counters. Each check-*.sh script sources this fresh, so these
# start at zero every time and demo-certify.sh reads the final tally via
# the exit code + printed PASS/FAIL/WARN lines it captures.
CHECK_PASS=0
CHECK_FAIL=0
CHECK_WARN=0

pass() {
  CHECK_PASS=$((CHECK_PASS + 1))
  echo "${C_GREEN}  PASS${C_RESET}  $1"
}

fail() {
  CHECK_FAIL=$((CHECK_FAIL + 1))
  echo "${C_RED}  FAIL${C_RESET}  $1"
}

warn() {
  CHECK_WARN=$((CHECK_WARN + 1))
  echo "${C_YELLOW}  WARN${C_RESET}  $1"
}

info() {
  echo "${C_BLUE}  ---${C_RESET}   $1"
}

section() {
  echo ""
  echo "${C_BOLD}== $1 ==${C_RESET}"
}

# Call at the end of every check-*.sh. Prints a summary line in a fixed
# machine-parseable format that demo-certify.sh greps for, then exits
# non-zero if anything failed (warnings do not fail the build).
finish_check() {
  local name="$1"
  echo ""
  echo "SUMMARY[$name] pass=$CHECK_PASS fail=$CHECK_FAIL warn=$CHECK_WARN"
  if [ "$CHECK_FAIL" -gt 0 ]; then
    exit 1
  fi
  exit 0
}

# Load the page registry (scripts/demo/demo-pages.conf) as an array.
# Format: one entry per line, "label|relative/path/from/html/root.html"
# Blank lines and lines starting with # are ignored.
load_page_registry() {
  local conf="$DEMO_LIB_DIR/demo-pages.conf"
  if [ ! -f "$conf" ]; then
    echo "ERROR: missing $conf" >&2
    return 1
  fi
  grep -vE '^\s*(#|$)' "$conf"
}
