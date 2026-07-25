#!/usr/bin/env bash
# scripts/demo/check-relays.sh
#
# For each vertical in relay-verticals.conf:
#   1. war-room page must call TSM.relay.write with the registered domain key
#   2. strategist and executive-portal pages must reference that same
#      domain key somewhere (TSM.relay.read('KEY'), CFG.domain, etc.)
# This is the automated version of the "mismatched domain keys" bug class
# documented in ARCHITECTURE-NOTES.md — a vertical whose war-room writes
# under one key while its strategist reads a different one looks fine in
# isolation but silently shows stale/empty data in the demo.
set -uo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

CONF="$DEMO_LIB_DIR/relay-verticals.conf"

section "check-relays: domain-key consistency"

while IFS='|' read -r vertical war strat exec domain; do
  [ -z "${domain:-}" ] && continue
  base="$HTML_ROOT/war-rooms/$vertical"
  war_f="$base/$war"; strat_f="$base/$strat"; exec_f="$base/$exec"

  if [ ! -f "$war_f" ]; then
    warn "$vertical: war-room file not found ($war) — skipping relay check"
    continue
  fi

  if grep -qE "TSM\.relay\.write\(\s*['\"]${domain}['\"]" "$war_f"; then
    pass "$vertical: war-room writes domain '$domain'"
  else
    fail "$vertical: war-room does NOT call TSM.relay.write('$domain', ...) — check for a stale/renamed domain key"
  fi

  for pair in "strategist:$strat_f" "executive-portal:$exec_f"; do
    role="${pair%%:*}"; f="${pair#*:}"
    if [ ! -f "$f" ]; then
      warn "$vertical: $role file not found — skipping"
      continue
    fi
    if grep -qF "$domain" "$f"; then
      pass "$vertical: $role references domain '$domain'"
    else
      fail "$vertical: $role does NOT reference domain '$domain' — likely reading the wrong relay channel"
    fi
  done
done < <(grep -vE '^\s*(#|$)' "$CONF")

finish_check "check-relays"
